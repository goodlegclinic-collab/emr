/**
 * 富足診所 - 初診單系統
 * 前端應用程式
 */

// Google Apps Script 網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTdv5lVPIfUi-9Du8k-sK8_YXeKJJTbiPoCHS2Z-WcV6f4E1tWim-0abmVu2tgFkfxGA/exec';

// ConvertKit (Kit) 電子報訂閱
const KIT_FORM_ID = '8736032';
const KIT_API_SECRET = 'jCtH74KLLlWw7nMjmLQnFTB-FBNVKJAcO7mI6EeXcgA';

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
            alert('請簽名 Please sign');
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
    
    // 個人病史
    data.personalHistory = {
        cardiovascular: formData.get('ph_cardiovascular') === '是',
        metabolic: formData.get('ph_metabolic') === '是',
        cancer: formData.get('ph_cancer') === '是',
        cancerDetail: formData.get('ph_cancer_detail') || '',
        surgery: formData.get('ph_surgery') === '是',
        surgeryDetail: formData.get('ph_surgery_detail') || '',
        drugAllergy: formData.get('ph_allergy') === '是',
        drugAllergyDetail: formData.get('ph_allergy_detail') || '',
        other: formData.get('ph_other') === '是',
        otherDetail: formData.get('ph_other_detail') || ''
    };
    
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
            <h3>基本資料 Basic Information</h3>
            <table class="preview-table">
                <tr><td>姓名 Name</td><td>${data.name}</td></tr>
                <tr><td>性別 Gender</td><td>${data.gender}</td></tr>
                <tr><td>出生日期 DOB</td><td>民國 ${data.birthYear} 年 ${data.birthMonth} 月 ${data.birthDay} 日</td></tr>
                <tr><td>身分證字號 ID</td><td>${data.idNumber}</td></tr>
                <tr><td>手機 Mobile</td><td>${data.mobilePhone}</td></tr>
                ${data.homePhone ? `<tr><td>室內電話 Home</td><td>${data.homePhone}</td></tr>` : ''}
                <tr><td>聯絡地址 Address</td><td>${data.address}</td></tr>
                <tr><td>緊急聯絡人 Emergency</td><td>${data.emergencyContact}（${data.relationship}）</td></tr>
                <tr><td>緊急聯絡電話 Phone</td><td>${data.emergencyPhone}</td></tr>
                ${data.email ? `<tr><td>電子信箱 Email</td><td>${data.email}</td></tr>` : ''}
            </table>
        </div>

        <div class="preview-section">
            <h3>個人病史 Personal Medical History</h3>
            <ul class="preview-list">
                <li>心血管疾病：${data.personalHistory.cardiovascular ? '是' : '否'}</li>
                <li>代謝疾病：${data.personalHistory.metabolic ? '是' : '否'}</li>
                <li>惡性疾病：${data.personalHistory.cancer ? '是' : '否'}${data.personalHistory.cancerDetail ? '（' + data.personalHistory.cancerDetail + '）' : ''}</li>
                <li>曾接受手術：${data.personalHistory.surgery ? '是' : '否'}${data.personalHistory.surgeryDetail ? '（' + data.personalHistory.surgeryDetail + '）' : ''}</li>
                <li>藥物過敏：${data.personalHistory.drugAllergy ? '是' : '否'}${data.personalHistory.drugAllergyDetail ? '（' + data.personalHistory.drugAllergyDetail + '）' : ''}</li>
                <li>其他：${data.personalHistory.other ? '是' : '否'}${data.personalHistory.otherDetail ? '（' + data.personalHistory.otherDetail + '）' : ''}</li>
            </ul>
        </div>

        <div class="preview-section">
            <h3>病人簽名 Patient Signature</h3>
            <img src="${data.signature}" alt="簽名 Signature" style="max-width: 300px; border: 1px solid #ccc;">
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
    submitBtn.textContent = '儲存中... Saving...';
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

        // 如果有填 email，自動訂閱電子報
        if (data.email) {
            subscribeToNewsletter(data.email, data.name);
        }

        // 顯示成功畫面
        document.getElementById('successModal').classList.add('active');
        window.scrollTo(0, 0);
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ 儲存失敗，請稍後再試 Save failed, please try again: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * 重設表單
 */
function resetForm() {
    document.getElementById('successModal').classList.remove('active');
    document.getElementById('patientForm').reset();
    signaturePad.clear();
    setTodayDate();
    
    // 滾動到頂部
    window.scrollTo(0, 0);
}

/**
 * 訂閱 Kit (ConvertKit) 電子報
 */
async function subscribeToNewsletter(email, name) {
    try {
        await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_secret: KIT_API_SECRET,
                email: email,
                first_name: name || ''
            })
        });
        console.log('Newsletter subscribed:', email);
    } catch (error) {
        // 訂閱失敗不影響主流程
        console.error('Newsletter subscribe error:', error);
    }
}
