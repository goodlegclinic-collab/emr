/**
 * 富足診所 - 電子病歷系統
 * Google Apps Script 後端
 * 
 * 部署步驟：
 * 1. 用 goodlegclinic@gmail.com 登入 Google
 * 2. 前往 https://script.google.com
 * 3. 點「新專案」
 * 4. 刪除預設程式碼，貼上這整段
 * 5. 點上方「部署」→「新增部署作業」
 * 6. 類型選「網頁應用程式」
 * 7. 執行身分：「我」
 * 8. 誰可以存取：「所有人」
 * 9. 點「部署」，複製網址給蓋特
 */

// Google Drive 資料夾名稱（會自動建立）
const FOLDER_NAME = '電子病歷_初診單';

/**
 * 處理 POST 請求（接收表單資料）
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 取得或建立資料夾
    const folder = getOrCreateFolder(FOLDER_NAME);
    
    // 建立 PDF
    const pdfBlob = createPDF(data);
    
    // 檔案命名：日期_姓名_初診單.pdf
    const fileName = `${data.fillDate || formatDate(new Date())}_${data.name}_初診單.pdf`;
    
    // 儲存到 Google Drive
    const file = folder.createFile(pdfBlob.setName(fileName));
    
    // 同時儲存原始資料為 JSON（方便日後查詢）
    const jsonFileName = `${data.fillDate || formatDate(new Date())}_${data.name}_初診單.json`;
    folder.createFile(jsonFileName, JSON.stringify(data, null, 2), 'application/json');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '儲存成功',
        fileId: file.getId(),
        fileName: fileName,
        fileUrl: file.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GET 請求（測試用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: '富足診所電子病歷系統 - Google Apps Script 後端運作中'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 取得或建立資料夾
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear() - 1911; // 轉民國年
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 建立 PDF
 */
function createPDF(data) {
  // 建立 HTML 內容
  const htmlContent = generateHTML(data);
  
  // 建立暫存的 Google Doc
  const tempDoc = DocumentApp.create('temp_初診單');
  const body = tempDoc.getBody();
  
  // 標題
  body.appendParagraph('富足診所 初診基本資料表')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph('');
  
  // 基本資料表格
  const table1 = body.appendTable();
  
  // 第一列：病歷號碼、填表日期
  let row = table1.appendTableRow();
  row.appendTableCell('病歷號碼').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.medicalRecordNumber || '（由診所填寫）');
  row.appendTableCell('填表日期').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.fillDate || '');
  
  // 第二列：姓名、性別
  row = table1.appendTableRow();
  row.appendTableCell('姓名').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.name || '');
  row.appendTableCell('性別').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.gender || '');
  
  // 第三列：出生日期、身分證字號
  row = table1.appendTableRow();
  row.appendTableCell('出生日期').setBackgroundColor('#f0f0f0');
  row.appendTableCell(`民國 ${data.birthYear || ''}年 ${data.birthMonth || ''}月 ${data.birthDay || ''}日`);
  row.appendTableCell('身分證字號').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.idNumber || '');
  
  // 第四列：聯絡電話
  row = table1.appendTableRow();
  row.appendTableCell('聯絡電話（宅）').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.homePhone || '');
  row.appendTableCell('手機').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.mobilePhone || '');
  
  // 第五列：戶籍地址
  row = table1.appendTableRow();
  row.appendTableCell('戶籍地址').setBackgroundColor('#f0f0f0');
  const address = `${data.city || ''}${data.district || ''}${data.village || ''}${data.neighborhood || ''}${data.address || ''}`;
  row.appendTableCell(address).setColSpan(3);
  
  // 第六列：緊急聯絡人
  row = table1.appendTableRow();
  row.appendTableCell('緊急聯絡人').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.emergencyContact || '');
  row.appendTableCell('關係').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.relationship || '');
  
  // 第七列：緊急聯絡人電話、Email
  row = table1.appendTableRow();
  row.appendTableCell('緊急聯絡人電話').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.emergencyPhone || '');
  row.appendTableCell('電子信箱').setBackgroundColor('#f0f0f0');
  row.appendTableCell(data.email || '');
  
  // 第八列：得知本院訊息
  row = table1.appendTableRow();
  row.appendTableCell('得知本院訊息').setBackgroundColor('#f0f0f0');
  const sources = [];
  if (data.sourceChannels) {
    if (data.sourceChannels.facebook) sources.push('Facebook');
    if (data.sourceChannels.line) sources.push('LINE');
    if (data.sourceChannels.website) sources.push('官網');
    if (data.sourceChannels.friendRefer) sources.push('親友介紹');
    if (data.sourceChannels.google) sources.push('Google搜尋');
  }
  row.appendTableCell(sources.join('、') || '').setColSpan(3);
  
  // 介紹人
  if (data.referrerName) {
    row = table1.appendTableRow();
    row.appendTableCell('介紹人姓名').setBackgroundColor('#f0f0f0');
    row.appendTableCell(data.referrerName).setColSpan(3);
  }
  
  body.appendParagraph('');
  
  // 家族病史
  body.appendParagraph('家族病史')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  body.appendParagraph('請問您的直系血親中，是否曾罹患以下疾病？');
  
  const familyHistory = data.familyHistory || {};
  const historyItems = [
    { key: 'cardiovascular', label: '中風、心肌梗塞等心血管疾病' },
    { key: 'metabolic', label: '高血壓、糖尿病、高血脂等代謝疾病' },
    { key: 'cancer', label: '癌症等惡性疾病' },
    { key: 'other', label: '其他（自體免疫疾病、重大傷病等）' }
  ];
  
  historyItems.forEach(item => {
    const checked = familyHistory[item.key] ? '☑' : '☐';
    body.appendListItem(`${checked} ${item.label}`);
  });
  
  if (data.familyHistoryOther) {
    body.appendParagraph(`其他說明：${data.familyHistoryOther}`);
  }
  
  body.appendParagraph('');
  
  // 簽名
  body.appendParagraph('病人簽名')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  if (data.signature) {
    // 如果有簽名圖片（Base64）
    try {
      const signatureData = data.signature.replace(/^data:image\/\w+;base64,/, '');
      const signatureBlob = Utilities.newBlob(Utilities.base64Decode(signatureData), 'image/png', 'signature.png');
      body.appendImage(signatureBlob).setWidth(200).setHeight(80);
    } catch (e) {
      body.appendParagraph('（簽名圖片載入失敗）');
    }
  } else {
    body.appendParagraph('（未簽名）');
  }
  
  body.appendParagraph('');
  body.appendParagraph(`填表日期：${data.fillDate || ''}`);
  
  // 轉換為 PDF
  tempDoc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(tempDoc.getId()).getAs('application/pdf');
  
  // 刪除暫存文件
  DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
  
  return pdfBlob;
}

/**
 * 產生 HTML（備用）
 */
function generateHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>初診基本資料表</title>
    </head>
    <body>
      <h1>富足診所 初診基本資料表</h1>
      <p>姓名：${data.name || ''}</p>
      <p>身分證字號：${data.idNumber || ''}</p>
      <!-- 更多欄位... -->
    </body>
    </html>
  `;
}

/**
 * 測試函數
 */
function testCreatePDF() {
  const testData = {
    name: '測試病人',
    gender: '男',
    birthYear: '80',
    birthMonth: '5',
    birthDay: '15',
    idNumber: 'A123456789',
    mobilePhone: '0912345678',
    city: '台中市',
    district: '西屯區',
    address: '測試路123號',
    emergencyContact: '測試聯絡人',
    relationship: '配偶',
    emergencyPhone: '0987654321',
    familyHistory: {
      cardiovascular: true,
      metabolic: false,
      cancer: false,
      other: false
    },
    fillDate: '114/02/13'
  };
  
  const folder = getOrCreateFolder(FOLDER_NAME);
  const pdfBlob = createPDF(testData);
  const file = folder.createFile(pdfBlob.setName('測試_初診單.pdf'));
  Logger.log('測試 PDF 已建立：' + file.getUrl());
}
