function handleRecordSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('locationInput');
    const userText = inputField.value;

    if (!userText.trim()) return;

    // 즉시 입력 피드백 및 대기 시간 제로화 (A방식 핵심 인터페이스)
    inputField.value = '';
    
    // 백그라운드 가상 연동 (2초 후 AI 분류 완료 트리거)
    setTimeout(() => {
        showNotification("안방 서랍에 '자동차 키'를 보관 처리했습니다.");
    }, 1800);
}

function showNotification(message) {
    const toast = document.getElementById('notificationToast');
    const toastMsg = document.getElementById('toastMessage');
    
    toastMsg.innerText = message;
    toast.classList.remove('hidden');

    // 6초간 노출 후 자동 숨김
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 6000);
}

function editMode() {
    alert("수정 패널을 호출합니다 (GAS 연동 대기)");
    document.getElementById('notificationToast').classList.add('hidden');
}