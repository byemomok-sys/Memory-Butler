// [필수 변경] 본인의 구글 웹 앱 배포 URL 주소를 기입하세요.
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyTCcxKAPAbo5-2hbfDBlisXoTKKHyC6ODrhmqpRAbYC2JBNbBdoCFIZYFcnNnvg0m04w/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadCachedData();
    fetchLatestData();
});

async function handleRecordSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('locationInput');
    const userText = inputField.value.trim();
    if (!userText) return;

    inputField.value = ''; // 대기 제로화 리셋
    showNotification("기억집사가 위치 문맥을 분석 중입니다...", true);

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ text: userText })
        });
        const result = await response.json();
        if (result.success) {
            showNotification(`🔔 '${result.parsed.item}' 위치를 기억했습니다.`);
            updateUIAndCache(result.data);
        } else {
            showNotification("⚠️ AI 분석 엔진 구동 실패");
        }
    } catch (error) {
        showNotification("⚠️ 네트워크 연결 상태를 확인하세요.");
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
        console.warn("백그라운드 동기화 실패 (오프라인/캐시 모드 유지)");
    }
}

function updateUIAndCache(data) {
    localStorage.setItem('memory_butler_cache', JSON.stringify(data));
    renderSpaceContainer(data);
}

// ★ [옵션 1 적용] 대공간 L1 기준으로 그룹화하고, 아이템 하단에 L2 ➔ L3 브레드크럼 표출
function renderSpaceContainer(data) {
    const container = document.getElementById('spaceContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="widget-status" style="padding:40px 0;">기록된 유효 물품이 없습니다.</div>`;
        document.querySelector('.total-count').innerText = "보관 물품 0개";
        return;
    }

    document.querySelector('.total-count').innerText = `보관 물품 ${data.length}개`;

    // 1. 대공간(space_l1) 기준 그룹화
    const grouped = {};
    data.forEach(item => {
        const primarySpace = item.space_l1 || "미분류";
        if (!grouped[primarySpace]) grouped[primarySpace] = [];
        grouped[primarySpace].push(item);
    });

    // 2. 카드 빌딩
    Object.keys(grouped).forEach(spaceL1 => {
        const items = grouped[spaceL1];
        let folderIcon = "📦";
        if (spaceL1.includes("안방") || spaceL1.includes("방")) folderIcon = "🏠";
        if (spaceL1.includes("주방") || spaceL1.includes("부엌")) folderIcon = "🍳";
        if (spaceL1.includes("거실")) folderIcon = "🛋️";
        if (spaceL1.includes("창고") || spaceL1.includes("베란다")) folderIcon = "📦";

        const spaceCard = document.createElement('div');
        spaceCard.className = 'space-card';

        let itemCardsHTML = '';
        items.forEach(item => {
            const imgSeed = item.item.charCodeAt(0) % 100;
            
            // 중공간, 소공간 존재 여부에 따른 브레드크럼 한 줄 경로 조합 생성
            let breadcrumbPath = "";
            if (item.space_l2) breadcrumbPath += item.space_l2;
            if (item.space_l3) breadcrumbPath += (breadcrumbPath ? " ➔ " : "") + item.space_l3;
            if (!breadcrumbPath) breadcrumbPath = "상세 위치 없음";

            itemCardsHTML += `
                <div class="item-card">
                    <div class="icon-avatar">
                        <img src="https://picsum.photos/100?random=${imgSeed}" alt="${item.item}">
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
    alert("스프레드시트 원격 제어 모듈 준비 중");
    document.getElementById('notificationToast').classList.add('hidden');
}