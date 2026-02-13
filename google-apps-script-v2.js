/**
 * 富足診所 - 電子病歷系統 v2
 * Google Apps Script 後端（簡化版）
 */

const FOLDER_NAME = '電子病歷_初診單';

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const folder = getOrCreateFolder(FOLDER_NAME);
    
    // 檔案命名
    const fileName = `${data.fillDate || getTodayString()}_${data.name}_初診單`;
    
    // 儲存 JSON
    folder.createFile(fileName + '.json', JSON.stringify(data, null, 2), 'application/json');
    
    // 產生並儲存 PDF
    const pdfBlob = createSimplePDF(data);
    folder.createFile(pdfBlob.setName(fileName + '.pdf'));
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '儲存成功',
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GET 請求（測試用）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: '富足診所電子病歷系統 v2'
  })).setMimeType(ContentService.MimeType.JSON);
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
 * 取得今天日期字串
 */
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 產生簡單 PDF
 */
function createSimplePDF(data) {
  // 建立 Google Doc
  const doc = DocumentApp.create('temp_初診單_' + new Date().getTime());
  const body = doc.getBody();
  
  // 設定頁面樣式
  body.setMarginTop(40);
  body.setMarginBottom(40);
  body.setMarginLeft(50);
  body.setMarginRight(50);
  
  // 標題
  const title = body.appendParagraph('富足診所 初診基本資料表');
  title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.setSpacingAfter(20);
  
  // 分隔線
  body.appendHorizontalRule();
  body.appendParagraph('');
  
  // 基本資料區
  const section1 = body.appendParagraph('【基本資料】');
  section1.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  section1.setSpacingAfter(10);
  
  addField(body, '病歷號碼', data.medicalRecordNumber || '（由診所填寫）');
  addField(body, '填表日期', data.fillDate || '');
  addField(body, '姓　　名', data.name || '');
  addField(body, '性　　別', data.gender || '');
  addField(body, '出生日期', `民國 ${data.birthYear || ''} 年 ${data.birthMonth || ''} 月 ${data.birthDay || ''} 日`);
  addField(body, '身分證字號', data.idNumber || '');
  addField(body, '聯絡電話（宅）', data.homePhone || '無');
  addField(body, '手　　機', data.mobilePhone || '');
  addField(body, '聯絡地址', data.address || '');
  addField(body, '緊急聯絡人', data.emergencyContact || '');
  addField(body, '與病患關係', data.relationship || '');
  addField(body, '緊急聯絡電話', data.emergencyPhone || '');
  addField(body, '電子信箱', data.email || '無');
  
  // 得知訊息來源
  let sources = [];
  if (data.sourceChannels) {
    if (data.sourceChannels.facebook) sources.push('Facebook');
    if (data.sourceChannels.ig) sources.push('IG');
    if (data.sourceChannels.website) sources.push('診所網站');
    if (data.sourceChannels.friendRefer) sources.push('親友介紹');
    if (data.sourceChannels.google) sources.push('Google搜尋');
  }
  addField(body, '得知本院訊息', sources.length > 0 ? sources.join('、') : '無');
  if (data.referrerName) {
    addField(body, '介紹人姓名', data.referrerName);
  }
  
  body.appendParagraph('');
  
  // 家族病史區
  const section2 = body.appendParagraph('【家族病史】');
  section2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  section2.setSpacingAfter(10);
  
  let historyItems = [];
  if (data.familyHistory) {
    if (data.familyHistory.cardiovascular) historyItems.push('☑ 中風、心肌梗塞等心血管疾病');
    if (data.familyHistory.metabolic) historyItems.push('☑ 高血壓、糖尿病、高血脂等代謝疾病');
    if (data.familyHistory.cancer) historyItems.push('☑ 癌症等惡性疾病');
    if (data.familyHistory.other) historyItems.push('☑ 其他（自體免疫疾病、重大傷病等）');
  }
  
  if (historyItems.length > 0) {
    historyItems.forEach(item => {
      body.appendParagraph(item);
    });
  } else {
    body.appendParagraph('無');
  }
  
  if (data.familyHistoryOther) {
    addField(body, '其他說明', data.familyHistoryOther);
  }
  
  body.appendParagraph('');
  
  // 簽名區
  const section3 = body.appendParagraph('【病人簽名】');
  section3.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  section3.setSpacingAfter(10);
  
  if (data.signature) {
    try {
      const signatureData = data.signature.replace(/^data:image\/\w+;base64,/, '');
      const signatureBlob = Utilities.newBlob(Utilities.base64Decode(signatureData), 'image/png', 'signature.png');
      const img = body.appendImage(signatureBlob);
      img.setWidth(200);
      img.setHeight(80);
    } catch (e) {
      body.appendParagraph('（簽名圖片載入失敗）');
    }
  } else {
    body.appendParagraph('（未簽名）');
  }
  
  body.appendParagraph('');
  body.appendParagraph('填表日期：' + (data.fillDate || getTodayString()));
  
  // 儲存並轉換為 PDF
  doc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  
  // 刪除暫存文件
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  
  return pdfBlob;
}

/**
 * 新增欄位
 */
function addField(body, label, value) {
  const para = body.appendParagraph(label + '：' + value);
  para.setSpacingAfter(5);
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
    address: '台中市西屯區市政路123號',
    emergencyContact: '測試聯絡人',
    relationship: '配偶',
    emergencyPhone: '0987654321',
    sourceChannels: {
      facebook: true,
      ig: false,
      website: true
    },
    familyHistory: {
      cardiovascular: true,
      metabolic: false,
      cancer: false,
      other: false
    },
    fillDate: '114/02/13'
  };
  
  const folder = getOrCreateFolder(FOLDER_NAME);
  const pdfBlob = createSimplePDF(testData);
  const file = folder.createFile(pdfBlob.setName('測試_初診單.pdf'));
  Logger.log('測試 PDF 已建立：' + file.getUrl());
}
