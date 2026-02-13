/**
 * 富足診所 - 初診單系統
 * 前端應用程式
 */

// Google Apps Script 網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytq1qOTmCTbft_NeSzFPMSzYkbctejgTLmBFgXdiFy0a6xCvtPAwjZ4JddzmDIyyFbkQ/exec';

// 全域變數
let signaturePad;

/**
 * 頁面載入完成
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化簽名板
    const canvas = document.getElementById('signatureCanvas');
    signaturePad = new SignaturePad(canvas);
    
    // 清除簽名按鈕
    document.getElementById('clearSignature').addEventListener('click', function() {
        signaturePad.clear();
    });
    
    // 設定今天日期
    setTodayDate();
    
    // 表單送出
    document.getElementById('patientForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 檢查簽名
        if (signaturePad.isEmpty()) {
            alert('請簽名');
            return;
        }
        
        submitForm();
    });
    
    // 新病人按鈕
    document.getElementById('newPatient').addEventListener('click', resetForm);
});

/**
 * 設定今天日期
 */
function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('fillDate').value = `${year}-${month}-${day}`;
}

/**
 * 初始化地址選單（已簡化為文字輸入）
 */
function initAddressSelects() {
    // 地址改為直接輸入，不需要初始化
}

/**
 * 收集表單資料
 */
function collectFormData() {
    const form = document.getElementById('patientForm');
    const formData = new FormData(form);
    
    // 基本資料
    const data = {
        medicalRecordNumber: formData.get('medicalRecordNo') || '',
        fillDate: formatDate(formData.get('fillDate')),
        name: formData.get('name'),
        gender: formData.get('gender') === 'male' ? '男' : '女',
        birthYear: formData.get('birthYear'),
        birthMonth: formData.get('birthMonth'),
        birthDay: formData.get('birthDay'),
        idNumber: formData.get('idNumber').toUpperCase(),
        homePhone: formData.get('phoneHome') || '',
        mobilePhone: formData.get('phoneMobile'),
        address: formData.get('address'),
        emergencyContact: formData.get('emergencyContact'),
        relationship: formData.getAll('emergencyRelation').join('、'),
        emergencyPhone: formData.get('emergencyPhone'),
        email: formData.get('email') || '',
        referrerName: formData.get('referrer') || ''
    };
    
    // 得知訊息來源
    data.sourceChannels = {
        facebook: formData.getAll('source').includes('FB'),
        ig: formData.getAll('source').includes('IG'),
        website: formData.getAll('source').includes('診所網站'),
        friendRefer: formData.getAll('source').includes('親友介紹'),
        google: formData.getAll('source').includes('Google')
    };
    
    // 家族病史
    const familyHistoryValues = formData.getAll('familyHistory');
    data.familyHistory = {
        cardiovascular: familyHistoryValues.includes('心血管疾病'),
        metabolic: familyHistoryValues.includes('代謝疾病'),
        cancer: familyHistoryValues.includes('癌症'),
        other: familyHistoryValues.includes('其他')
    };
    data.familyHistoryOther = formData.get('familyHistoryOther') || '';
    
    // 簽名
    if (!signaturePad.isEmpty()) {
        data.signature = signaturePad.toDataURL();
    }
    
    return data;
}

/**
 * 格式化日期為民國年
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const rocYear = date.getFullYear() - 1911;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${rocYear}/${month}/${day}`;
}

/**
 * 顯示預覽
 */
function showPreview() {
    // 驗證表單
    const form = document.getElementById('patientForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // 檢查簽名
    if (signaturePad.isEmpty()) {
        alert('請簽名');
        return;
    }
    
    const data = collectFormData();
    
    // 建立預覽內容
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <div class="preview-section">
            <h3>基本資料</h3>
            <table class="preview-table">
                <tr><td>姓名</td><td>${data.name}</td></tr>
                <tr><td>性別</td><td>${data.gender}</td></tr>
                <tr><td>出生日期</td><td>民國 ${data.birthYear} 年 ${data.birthMonth} 月 ${data.birthDay} 日</td></tr>
                <tr><td>身分證字號</td><td>${data.idNumber}</td></tr>
                <tr><td>手機</td><td>${data.mobilePhone}</td></tr>
                ${data.homePhone ? `<tr><td>室內電話</td><td>${data.homePhone}</td></tr>` : ''}
                <tr><td>聯絡地址</td><td>${data.address}</td></tr>
                <tr><td>緊急聯絡人</td><td>${data.emergencyContact}（${data.relationship}）</td></tr>
                <tr><td>緊急聯絡電話</td><td>${data.emergencyPhone}</td></tr>
                ${data.email ? `<tr><td>電子信箱</td><td>${data.email}</td></tr>` : ''}
            </table>
        </div>
        
        <div class="preview-section">
            <h3>家族病史</h3>
            <ul class="preview-list">
                ${data.familyHistory.cardiovascular ? '<li>✓ 中風、心肌梗塞等心血管疾病</li>' : ''}
                ${data.familyHistory.metabolic ? '<li>✓ 高血壓、糖尿病、高血脂等代謝疾病</li>' : ''}
                ${data.familyHistory.cancer ? '<li>✓ 癌症等惡性疾病</li>' : ''}
                ${data.familyHistory.other ? '<li>✓ 其他（自體免疫疾病、重大傷病等）</li>' : ''}
                ${!data.familyHistory.cardiovascular && !data.familyHistory.metabolic && !data.familyHistory.cancer && !data.familyHistory.other ? '<li>無</li>' : ''}
            </ul>
            ${data.familyHistoryOther ? `<p>說明：${data.familyHistoryOther}</p>` : ''}
        </div>
        
        <div class="preview-section">
            <h3>病人簽名</h3>
            <img src="${data.signature}" alt="簽名" style="max-width: 300px; border: 1px solid #ccc;">
        </div>
    `;
    
    // 顯示 Modal
    document.getElementById('previewModal').classList.add('show');
}

/**
 * 關閉預覽
 */
function closePreview() {
    document.getElementById('previewModal').classList.remove('show');
}

/**
 * 送出表單
 */
async function submitForm() {
    const data = collectFormData();
    
    // 顯示載入狀態
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '儲存中...';
    submitBtn.disabled = true;
    
    try {
        // 送到 Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script 需要 no-cors
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        // 因為 no-cors，無法讀取回應，假設成功
        document.getElementById('successModal').classList.add('show');
        
    } catch (error) {
        console.error('Error:', error);
        alert('儲存失敗，請稍後再試：' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * 重設表單
 */
function resetForm() {
    document.getElementById('successModal').classList.remove('show');
    document.getElementById('patientForm').reset();
    signaturePad.clear();
    setTodayDate();
    
    // 滾動到頂部
    window.scrollTo(0, 0);
}
