// A방식 위젯: 사용자가 입력을 마치고 전송했을 때의 비동기 핸들러
function handleRecordSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('locationInput');
    const userText = inputField.value;

    if (!userText.trim()) return;

    // 1. 입력창은 즉시 초기화하여 사용자의 대기 시간을 없앰 (액션 최소화)
    inputField.value = '';
    console.log("백그라운드로 데이터 전송 완료:", userText);

    // 2. 백그라운드 AI 분석 시뮬레이션 (약 2초 후 완료 가정)
    // 실제 운영 환경에서는 이 부분에서 Google Apps Script(GAS) 웹훅을 호출하게 됩니다.
    setTimeout(() => {
        // AI가 "안방 서랍에 차 키 둠"에서 '안방(공간)', '차 키(물품)'를 분리했다고 가정한 메시지
        showNotification("🔔 안방 서랍에 '차 키'를 두셨습니다. 잘 기억해두겠습니다.");
    }, 2000);
}

// 부드러운 푸시 알림 노출 함수
function showNotification(message) {
    const toast = document.getElementById('notificationToast');
    const toastMsg = document.getElementById('toastMessage');
    
    toastMsg.innerText = message;
    toast.classList.remove('hidden');

    // 5초 후 자동으로 알림 숨김
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// 알림창 내부 [수정하기] 버튼 클릭 시 액션
function editMode() {
    alert("수정 모드로 진입합니다. (스프레드시트 수정 API 연동 예정)");
    document.getElementById('notificationToast').classList.add('hidden');
}