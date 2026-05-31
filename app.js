// [필수 변경] 구글 앱스 스크립트 웹앱 배포 후 획득한 URL을 여기에 붙여넣으세요.
const GAS_WEB_APP_URL = "Yhttps://script.google.com/macros/s/AKfycbyTCcxKAPAbo5-2hbfDBlisXoTKKHyC6ODrhmqpRAbYC2JBNbBdoCFIZYFcnNnvg0m04w/exec";

document.addEventListener('DOMContentLoaded', () => {
    // [하이브리드 싱크 1단계] 앱 개방 즉시 로컬 캐시 데이터 존재 시 즉시 렌더링 (로딩 대기 0초)
    loadCachedData();

    // [하이브리드 싱크 2단계] 백그라운드에서 조용히 GAS 최신 데이터 비동기 조회 후 화면 갱신
    fetchLatestData();
});

// A방식 위젯: 사용자가 한 줄 입력 후 전송 시 호출되는 함수
async function handleRecordSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('locationInput');
    const userText = inputField.value.trim();

    if (!userText) return;

    // 사용자의 대기 시간 최소화: 입력 폼은 즉각 비우기
    inputField.value = '';

    // 백그라운드 AI 파이프라인 가동 안내 토스트 구동
    showNotification("AI 비서가 문장을 분석하고 있습니다...", true);

    try {
        // GAS 웹훅 POST 호출
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ text: userText })
        });

        const result = await response.json();

        if (result.success) {
            // AI 파싱 성공 알림으로 전환
            showNotification(`🔔 ${result.parsed.space}에 '${result.parsed.item}'을(를) 보관 처리했습니다.`);
            
            // 실시간 리턴된 전체 데이터를 바탕으로 화면 재배치 및 로컬 캐시 갱신
            updateUIAndCache(result.data);
        } else {
            showNotification("⚠️ AI 분석 중 엔진 오류가 발생했습니다.");
        }
    } catch (error) {
        console.error("GAS 통신 장애:", error);
        showNotification("⚠️ 네트워크 상태를 확인해 주세요 (오프라인 상태)");
    }
}

// 로컬 저장소 캐시 로드 함수
function loadCachedData() {
    const cached = localStorage.getItem('memory_butler_cache');
    if (cached) {
        const data = JSON.parse(cached);
        renderSpaceContainer(data);
    }
}

// 백그라운드 실시간 서버 싱크 (GAS GET 요청)
async function fetchLatestData() {
    try {
        const response = await fetch(GAS_WEB_APP_URL);
        const result = await response.json();
        
        if (result.success && result.data) {
            updateUIAndCache(result.data);
        }
    } catch (error) {
        console.warn("서버 백그라운드 싱크 실패 (이전 로컬 저장소 데이터 유지됨):", error);
    }
}

// UI 렌더링 및 캐시 동시 동기화 인터페이스
function updateUIAndCache(data) {
    localStorage.setItem('memory_butler_cache', JSON.stringify(data));
    renderSpaceContainer(data);
}

// 데이터를 분류하여 공간 마스터 카드로 동적 생성 및 렌더링
function renderSpaceContainer(data) {
    const container = document.getElementById('spaceContainer');
    container.innerHTML = ''; // 기본 샘플 제거

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="widget-status" style="padding:40px 0;">보관된 물품이 없습니다. 첫 한줄 기록을 시작해 보세요!</div>`;
        document.querySelector('.total-count').innerText = "보관 물품 0개";
        return;
    }

    // 대공간(space)을 기준으로 그룹핑 맵 가공
    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.space]) {
            grouped[item.space] = [];
        }
        grouped[item.space].push(item);
    });

    // 전체 총 재고 개수 업데이트
    document.querySelector('.total-count').innerText = `보관 물품 ${data.length}개`;

    // 공간 단위 루프 돌며 카드 생성
    Object.keys(grouped).forEach(spaceName => {
        const items = grouped[spaceName];
        
        // 공간 매칭형 대표 이모지 셀렉터
        let folderIcon = "📦";
        if (spaceName.includes("방") || spaceName.includes("룸")) folderIcon = "🏠";
        if (spaceName.includes("주방") || spaceName.includes("부엌") || spaceName.includes("씽크")) folderIcon = "🍳";
        if (spaceName.includes("거실")) folderIcon = "🛋️";
        if (spaceName.includes("현관") || spaceName.includes("신발")) folderIcon = "👟";
        if (spaceName.includes("서재") || spaceName.includes("데스크")) folderIcon = "📚";
        if (spaceName.includes("창고") || spaceName.includes("베란다")) folderIcon = "📦";

        const spaceCard = document.createElement('div');
        spaceCard.className = 'space-card';

        let itemCardsHTML = '';
        items.forEach(item => {
            // ★ 이미지 풀 배정 구조 유지 + 아이템명 기반 랜덤 가상 씨드 이미지 매핑 (No-Gap 핏)
            const imgSeed = item.item.charCodeAt(0) % 100;
            itemCardsHTML += `
                <div class="item-card">
                    <div class="icon-avatar">
                        <img src="https://picsum.photos/100?random=${imgSeed}" alt="${item.item}">
                    </div>
                    <div class="item-info">
                        <span class="item-name">${item.item}</span>
                        <span class="item-meta">${item.detail}</span>
                    </div>
                    <div class="time-chip">${item.timeChip}</div>
                </div>
            `;
        });

        spaceCard.innerHTML = `
            <div class="space-card-header">
                <span class="folder-icon">${folderIcon}</span>
                <h4>${spaceName}</h4>
                <span class="badge-count">${items.length}</span>
            </div>
            <div class="item-list">
                ${itemCardsHTML}
            </div>
        `;
        container.appendChild(spaceCard);
    });
}

// 토스트 푸시 노출 유틸리티
function showNotification(message, isLoading = false) {
    const toast = document.getElementById('notificationToast');
    const toastMsg = document.getElementById('toastMessage');
    const loader = document.querySelector('.toast-loader');
    
    toastMsg.innerText = message;
    loader.style.display = isLoading ? 'block' : 'none';
    toast.classList.remove('hidden');

    // 분석 로딩 중이 아닐 때만 6초 후 자동 오프 처리
    if (!isLoading) {
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 6000);
    }
}

function editMode() {
    alert("상세 수정 모드는 추후 스프레드시트 셀 값 직접 제어 연동으로 구동 가능합니다.");
    document.getElementById('notificationToast').classList.add('hidden');
}