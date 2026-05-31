// [필수 변경] 사용하실 구글 및 Gemini API 키 정보를 대입하세요.
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// 1. 앱 웹위젯에서 한 줄 기록 POST 요청이 들어왔을 때 백그라운드 비동기 처리 파이프라인
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const userText = params.text;
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName("Log_Data");
    const invSheet = ss.getSheetByName("Main_Inventory");
    
    // [파이프라인 1] 원본 Log_Data 보존 기록
    logSheet.appendRow([new Date(), userText]);
    
    // [파이프라인 2] Gemini 1.5 Flash API 호출을 통한 지능형 자연어 추출 (공간/물품 분리)
    const parsedData = callGeminiAI(userText);
    
    // [파이프라인 3] Main_Inventory 기록 기입
    const itemId = "MB_" + new Date().getTime();
    invSheet.appendRow([itemId, new Date(), parsedData.item, parsedData.space, parsedData.detail]);
    
    // [파이프라인 4] 공간 마스터 자동 매핑 자가 조직화 (옵션 A 자동 세분화)
    updateSpaceMaster(ss, parsedData.space);
    
    // [파이프라인 5] 갱신 처리 완료된 최신 전체 목록 반환
    const latestData = getAllInventoryData(ss);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      parsed: parsedData,
      data: latestData
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. 앱 실행 시 백그라운드 동기화용 실시간 데이터 전체 리드 (GET)
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const latestData = getAllInventoryData(ss);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: latestData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Gemini API 연동 모듈 (Strict JSON Mode 강제화)
function callGeminiAI(text) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
  
  const prompt = `주어진 한국어 보관 문장을 심층 분석하여 물품명(item), 보관 장소의 대분류 대공간(space), 그리고 수납함이나 구체적 서랍 등 보관 위치 상세 정보(detail)를 추출해라.
반드시 다른 군더더기 텍스트 없이 명시된 JSON 구조체 포맷으로만 응답해야 한다.

JSON 출력 포맷 예시:
{
  "item": "물품명 명사",
  "space": "대공간명 (예: 안방, 주방, 거실, 창고, 서재 등)",
  "detail": "상세 위치 설명 (예: 첫번째 서랍 안쪽, 옷장 세번째 칸, 책상 서랍 밑)"
}

문장: "${text}"`;

  const payload = {
    "contents": [{
      "parts": [{ "text": prompt }]
    }],
    "generationConfig": {
      "responseMimeType": "application/json"
    }
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  const jsonText = json.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText);
}

// 공간 마스터 체크 및 자동 누적 처리 규칙 (중복 제거)
function updateSpaceMaster(ss, spaceName) {
  if (!spaceName) return;
  const spaceSheet = ss.getSheetByName("Space_Master");
  const data = spaceSheet.getDataRange().getValues();
  let isExists = false;
  
  for(let i = 1; i < data.length; i++) {
    if(data[i][0] === spaceName) {
      isExists = true;
      break;
    }
  }
  if(!isExists) {
    spaceSheet.appendRow([spaceName, new Date()]);
  }
}

// 인벤토리 마스터 시트로부터 전체 원형 오브젝트 데이터 파싱 후 타임칩 연산 리턴
function getAllInventoryData(ss) {
  const invSheet = ss.getSheetByName("Main_Inventory");
  const data = invSheet.getDataRange().getValues();
  const items = [];
  
  if (data.length <= 1) return items; // 헤더만 존재할 때 빈배열 리턴
  
  for(let i = 1; i < data.length; i++) {
    items.push({
      id: data[i][0],
      date: data[i][1],
      item: data[i][2],
      space: data[i][3],
      detail: data[i][4],
      timeChip: calculateTimeRelative(data[i][1])
    });
  }
  // 가장 최근에 등록된 아이템이 위로 오도록 역정렬(선택)
  return items.reverse();
}

// 유효 보관 타임 세이브 칩 변환 알고리즘
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