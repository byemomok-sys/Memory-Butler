// =================================================================
// [프로젝트: Memory Butler (기억집사) - 백엔드 v5.0 마스터 완결본]
// [특징: 복수 입력 JSON 배열 파싱 및 하이브리드 공간 관리 API 탑재]
// =================================================================

const SPREADSHEET_ID = "1UCYykiW8lldY6_Wwg_T4u6jSI1YFVIS5Xhq9k3TBHlY";
const BASE_URL = "https://generativelanguage.googleapis.com/v1"; 

function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
}

// 📱 프론트엔드 데이터 획득용 GET 엔드포인트
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const latestData = getAllInventoryData(ss);
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: latestData }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// 📥 문맥 분석 및 저장/수정 동용 POST 엔드포인트
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName("Log_Data");
    const invSheet = ss.getSheetByName("Main_Inventory");
    
    // [기능분기 1] 마스터 공간에서 드래그앤드롭 후 전체 저장할 때
    if (params.action === "saveInventory") {
      const lastRow = invSheet.getLastRow();
      if(lastRow > 1) invSheet.getRange(2, 1, lastRow - 1, 6).clearContent();
      
      if(params.data && params.data.length > 0) {
        const writeData = params.data.map(obj => [
          obj.id || ("MB_" + new Date().getTime() + Math.floor(Math.random()*1000)), 
          new Date(), 
          obj.item, 
          obj.space_l1 || "미분류", 
          obj.space_l2 || "", 
          obj.space_l3 || ""
        ]);
        invSheet.getRange(2, 1, writeData.length, 6).setValues(writeData);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "공간 배치가 완전히 동기화되었습니다." })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // [기능분기 2] 일반 자연어 한 줄 입력 및 복수 문장 처리
    const userText = params.text;
    logSheet.appendRow([new Date(), userText]); // 원본 로깅
    
    let parsedList;
    try {
      parsedList = callGeminiBulkAI(userText);
    } catch(aiError) {
      // 통신 전면 마비 시 비상 방어선 (단일 처리 구조로 완충)
      parsedList = [{ 
        item: userText.substring(0, 15) + "...(분석장애)", 
        space_l1: "미분류", 
        space_l2: "", 
        space_l3: "" 
      }];
    }
    
    // 배열 구조를 루프 돌며 시트에 다중 적재 실행
    const resultMessages = [];
    parsedList.forEach(parsedData => {
      const itemId = "MB_" + new Date().getTime() + Math.floor(Math.random()*1000);
      const l1 = parsedData.space_l1 || "미분류";
      const l2 = parsedData.space_l2 || "";
      const l3 = parsedData.space_l3 || "";
      
      invSheet.appendRow([itemId, new Date(), parsedData.item, l1, l2, l3]);
      updateSpaceMaster(ss, l1);
      
      // 알림 메시지 조합 빌드
      let pathStr = l1;
      if(l2) pathStr += ` ➔ ${l2}`;
      if(l3) pathStr += ` ➔ ${l3}`;
      resultMessages.push(`[${parsedData.item}]을(를) '${pathStr}'에 넣었습니다.`);
    });
    
    const latestData = getAllInventoryData(ss);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      response: resultMessages.join("\n"),
      data: latestData
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// 🧠 [소장님 안 채택] 복수 물품 분석용 고도화 JSON 배열 파싱 엔진
function callGeminiBulkAI(text) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key 로드 실패");

  const prompt = `주어진 한국어 문장을 분석하여 보관하려는 물품들과 그 공간들을 정확히 추출해라. 
한 문장에 여러 물품이나 장소가 언급된 경우, 반드시 각각 분리하여 JSON 배열 구조로 응답해야 한다.
정보가 유추되지 않는 중간/소공간은 빈 문자열("")로 처리해라.

응답은 다른 안내 텍스트 없이 반드시 아래 예시 규격의 순수 JSON 배열만 출력해라:
[
  {
    "item": "칼",
    "space_l1": "주방",
    "space_l2": "선반",
    "space_l3": ""
  },
  {
    "item": "키",
    "space_l1": "안방",
    "space_l2": "책상",
    "space_l3": "첫번째 서랍"
  }
]

문장: "${text}"`;

  const modelsToTry = ["models/gemini-3.5-flash", "models/gemini-2.5-flash", "models/gemini-3.1-pro"];
  let response, responseCode, fetchSuccess = false;
  
  for (let m = 0; m < modelsToTry.length; m++) {
    try {
      const url = `${BASE_URL}/${modelsToTry[m]}:generateContent?key=${apiKey}`;
      response = UrlFetchApp.fetch(url, {
        "method": "post",
        "contentType": "application/json",
        "muteHttpExceptions": true,
        "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }], "generationConfig": { "temperature": 0.1 } })
      });
      responseCode = response.getResponseCode();
      if (responseCode === 200) { fetchSuccess = true; break; }
    } catch (e) {
      Utilities.sleep(1000);
    }
  }
  
  if (!fetchSuccess) throw new Error("엔진 통신 마비");
  
  const match = response.getContentText().match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON 배열 파싱 실패");
  return JSON.parse(match[0]);
}

function updateSpaceMaster(ss, spaceName) {
  if (!spaceName || spaceName === "미분류") return;
  const spaceSheet = ss.getSheetByName("Space_Master");
  const data = spaceSheet.getDataRange().getValues();
  let isExists = false;
  for(let i = 1; i < data.length; i++) {
    if(data[i][0] === spaceName) { isExists = true; break; }
  }
  if(!isExists) spaceSheet.appendRow([spaceName, new Date()]);
}

function getAllInventoryData(ss) {
  const invSheet = ss.getSheetByName("Main_Inventory");
  const data = invSheet.getDataRange().getValues();
  const items = [];
  if (data.length <= 1) return items;
  
  for(let i = 1; i < data.length; i++) {
    if (!data[i][2] || data[i][2].toString().trim() === "") continue; // 유령행 완벽 소거
    items.push({
      id: data[i][0],
      date: data[i][1],
      item: data[i][2],
      space_l1: data[i][3] || "미분류",
      space_l2: data[i][4] || "",
      space_l3: data[i][5] || "",
      timeChip: calculateTimeRelative(data[i][1])
    });
  }
  return items;
}

function calculateTimeRelative(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return diffMins + "분 전";
  if (diffHours < 24) return diffHours + "시간 전";
  return diffDays + "일 전";
}