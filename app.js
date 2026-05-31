// 소장님의 고유 고정 구글 앱스 스크립트 웹앱 주소 매핑
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyTCcxKAPAbo5-2hbfDBlisXoTKKHyC6ODrhmqpRAbYC2JBNbBdoCFIZYFcnNnvg0m04w/exec";

document.addEventListener('DOMContentLoaded', () => {
    // [하이브리드 싱크Step 1] 앱 개방 즉시 이전 캐시 데이터를 0초 만에 로드하여 출력
    loadCachedData();
    // [하이브리드 싱크Step 2] 백그라운드에서 조용히 GAS 서버의 최신본을 fetch하여 갱신
    fetchLatestData();
});

async function handleRecordSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('locationInput');
    const userText = inputField.value.trim();
    if (!userText) return;

    // 대기 피로도 제로화: 폼은 즉시 비움
    inputField.value = '';
    showNotification("기억집사가 위치 문맥을 백그라운드 분석 중입니다...", true);

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ text: userText })
        });
        const result = await response.json();
        if (result.success) {
            showNotification(`🔔 '${result.parsed.item}' 위치를 정형화하여 기록했습니다.`);
            // 실시간 리턴 리스트 데이터 반영 및 로컬 캐시 덮어쓰기
            updateUIAndCache(result.data);
        } else {
            showNotification("⚠️ AI 문맥 파싱 처리 중 장애가 발생했습니다.");
        }
    } catch (error) {
        showNotification("⚠️ 구글 서버 통신 오류 (네트워크 확인 필요)");
    }
}

function loadCachedData() {
    const cached = localStorage.getItem('memory_butler_cache');
    if (cached) renderSpaceContainer(JSON.parse(cached));
}

async function fetchLatestData() {
    try {
        const response = await fetch(GAS_WEB_APP_URL);
        const result = await response.json();
        if (result.success && result.data) updateUIAndCache(result.data);
    } catch (error) {
        console.warn("백그라운드 실시간 동기화 오프라인 홀딩");
    }
}

function updateUIAndCache(data) {
    localStorage.setItem('memory_butler_cache', JSON.stringify(data));
    renderSpaceContainer(data);
}

// ★ [옵션 1: 랭킹형 브레드크럼 계층 인터페이스 구현]
function renderSpaceContainer(data) {
    const container = document.getElementById('spaceContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="widget-status" style="padding:40px 0;">보관된 물품 자산이 없습니다.</div>`;
        document.querySelector('.total-count').innerText = "보관 물품 0개";
        return;
    }

    document.querySelector('.total-count').innerText = `보관 물품 ${data.length}개`;

    // 대공간(space_l1)을 대분류 헤더 키값으로 잡고 맵핑 처리
    const grouped = {};
    data.forEach(item => {
        const primarySpace = item.space_l1 || "미분류 대공간";
        if (!grouped[primarySpace]) grouped[primarySpace] = [];
        grouped[primarySpace].push(item);
    });

    Object.keys(grouped).forEach(spaceL1 => {
        const items = grouped[spaceL1];
        let folderIcon = "📦";
        if (spaceL1.includes("안방") || spaceL1.includes("방")) folderIcon = "🏠";
        if (spaceL1.includes("주방") || spaceL1.includes("부엌") || spaceL1.includes("식당")) folderIcon = "🍳";
        if (spaceL1.includes("거실")) folderIcon = "🛋️";
        if (spaceL1.includes("창고") || spaceL1.includes("베란다") || spaceL1.includes("다용도")) folderIcon = "📦";

        const spaceCard = document.createElement('div');
        spaceCard.className = 'space-card';

        let itemCardsHTML = '';
        items.forEach(item => {
            // 중공간과 소공간의 깊이를 가로형 경로 문자열(Breadcrumb)로 정제 추출
            let breadcrumbPath = "";
            if (item.space_l2) breadcrumbPath += item.space_l2;
            if (item.space_l3) breadcrumbPath += (breadcrumbPath ? " ➔ " : "") + item.space_l3;
            if (!breadcrumbPath) breadcrumbPath = "상세 위치 없음";

            itemCardsHTML += `
                <div class="item-card">
                    <div class="icon-avatar">
                        <img src="icon.png" alt="아이콘">
                    </div>
                    <div class="item-info">
                        <span class="item-name">${item.item}</span>
                        <span class="item-meta">${breadcrumbPath}</span>
                    </div>
                    <div class="time-chip">${item.timeChip}</div>
                </div>
            `;
        });

        spaceCard.innerHTML = `
            <div class="space-card-header">
                <span class="folder-icon">${folderIcon}</span>
                <h4>${spaceL1}</h4>
                <span class="badge-count">${items.length}</span>
            </div>
            <div class="item-list">${itemCardsHTML}</div>
        `;
        container.appendChild(spaceCard);
    });
}

function showNotification(message, isLoading = false) {
    const toast = document.getElementById('notificationToast');
    const toastMsg = document.getElementById('toastMessage');
    const loader = document.querySelector('.toast-loader');
    toastMsg.innerText = message;
    loader.style.display = isLoading ? 'block' : 'none';
    toast.classList.remove('hidden');
    if (!isLoading) {
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => toast.classList.add('hidden'), 6000);
    }
}

function editMode() {
    alert("상세 수정 기능 및 시트 직접 제어 모듈 대기 중");
    document.getElementById('notificationToast').classList.add('hidden');
}