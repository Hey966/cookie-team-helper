let db = JSON.parse(localStorage.getItem('myDB')) || [];
let teamsDB = JSON.parse(localStorage.getItem('myTeams')) || []; 

let currentTeamCookies = new Array(12).fill("");
let currentTeamPets = new Array(3).fill("");
let currentLoadedTeamId = null; 

let activeSlotType = ""; 
let activeSlotIndex = -1;
let currentDetailId = null; 

const rarityMap = ['','C','U','R','SR','SSR','TSSR'];

function showPage(p) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(p).classList.add('active');
    if (p === 'page-library') renderAll();
}

function updateStorageInfo() {
    let totalBytes = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalBytes += (localStorage[key].length + key.length) * 2;
        }
    }
    let kb = (totalBytes / 1024).toFixed(1);
    document.querySelectorAll('.storage-status').forEach(el => {
        el.innerHTML = `💾 空間使用: ${kb} KB / 5120 KB (約5MB)`;
        if (totalBytes > 4 * 1024 * 1024) el.style.color = '#f44336';
        else el.style.color = '#666';
    });
}

function resizeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > height) {
                    if (width > 150) { height = Math.round((height * 150) / width); width = 150; }
                } else {
                    if (height > 150) { width = Math.round((width * 150) / height); height = 150; }
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function saveItem() {
    const nameInput = document.getElementById('itemName');
    const typeInput = document.getElementById('itemType');
    const rarityInput = document.getElementById('itemRarity');
    const fileInput = document.getElementById('itemImg');
    
    if (!nameInput.value) return alert("請輸入名稱");
    let img = 'https://via.placeholder.com/50';
    if (fileInput.files[0]) img = await resizeImage(fileInput.files[0]);
    
    db.push({ id: Date.now().toString(), name: nameInput.value, type: typeInput.value, rarity: parseInt(rarityInput.value), img });
    
    try {
        localStorage.setItem('myDB', JSON.stringify(db));
    } catch (e) {
        db.pop(); alert("⚠️ 儲存空間已滿！"); return;
    }
    
    nameInput.value = ''; fileInput.value = ''; rarityInput.value = '6';
    alert("新增成功！");
    renderAll();
}

function renderAll() {
    const order = document.getElementById('sortOrder').value || 'high-low';
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    
    const filterType = document.getElementById('filterType') ? document.getElementById('filterType').value : 'all';
    const filterRarity = document.getElementById('filterRarity') ? document.getElementById('filterRarity').value : 'all';

    const showCookie = (filterType === 'all' || filterType === 'cookie');
    const showPet = (filterType === 'all' || filterType === 'pet');

    let cookies = showCookie ? db.filter(i => 
        i.type === 'cookie' && 
        i.name.toLowerCase().includes(searchTerm) &&
        (filterRarity === 'all' || i.rarity == filterRarity)
    ) : [];
    
    let pets = showPet ? db.filter(i => 
        i.type === 'pet' && 
        i.name.toLowerCase().includes(searchTerm) &&
        (filterRarity === 'all' || i.rarity == filterRarity)
    ) : [];
    
    const sortFunc = (a, b) => order === 'high-low' ? b.rarity - a.rarity : a.rarity - b.rarity;
    cookies.sort(sortFunc); pets.sort(sortFunc);

    document.getElementById('cookieCount').innerText = cookies.length;
    document.getElementById('petCount').innerText = pets.length;

    const generateCards = (list) => list.map(i => `
        <div class="item-card" onclick="openDetail('${i.id}')" style="cursor:pointer;">
            <img src="${i.img}">
            <div style="flex:1;">
                <b>${i.name}</b>
                <div style="font-size: 12px; color: #888; font-weight:bold;">稀有度: ${rarityMap[i.rarity]}</div>
            </div>
            <div style="color: #bbb; font-weight: bold; padding-right: 10px;">〉</div>
        </div>`).join('');

    let listHtml = '';
    if (cookies.length > 0) listHtml += `<div class="list-header">🍪 餅乾區</div>` + generateCards(cookies);
    if (pets.length > 0) listHtml += `<div class="list-header">🐾 寵物區</div>` + generateCards(pets);
    
    if (!listHtml && (searchTerm || filterType !== 'all' || filterRarity !== 'all')) {
        listHtml = `<div style="text-align:center; color:#999; margin-top:20px;">找不到符合條件的角色喔 🥲</div>`;
    } else if (!listHtml) {
        listHtml = `<div style="text-align:center; color:#999; margin-top:20px;">尚無資料，快去新增吧！</div>`;
    }
    
    document.getElementById('libraryList').innerHTML = listHtml;
    
    renderTeamUI(); 
    renderTeamsDropdown(); 
    updateStorageInfo();
}

function openDetail(id) {
    const item = db.find(x => x.id == id);
    if (!item) return;
    
    currentDetailId = id;
    
    document.getElementById('detailImgPreview').src = item.img;
    document.getElementById('detailTitle').innerText = item.name;
    document.getElementById('detailBadge').innerText = `${item.type === 'cookie' ? '🍪 餅乾' : '🐾 寵物'} - ${rarityMap[item.rarity]}`;
    
    document.getElementById('detailName').value = item.name;
    document.getElementById('detailRarity').value = item.rarity;
    document.getElementById('detailImg').value = ''; 
    
    document.getElementById('detailDeleteBtn').onclick = () => handleDelete(id, true);
    
    showPage('page-detail');
}

async function confirmDetailEdit() {
    const idx = db.findIndex(i => i.id == currentDetailId);
    if (idx === -1) return;
    
    db[idx].name = document.getElementById('detailName').value;
    db[idx].rarity = parseInt(document.getElementById('detailRarity').value);
    
    const f = document.getElementById('detailImg').files[0];
    if (f) db[idx].img = await resizeImage(f); 
    
    try { 
        localStorage.setItem('myDB', JSON.stringify(db)); 
        alert("資料已成功更新！");
        showPage('page-library'); 
    } catch (e) { 
        alert("⚠️ 儲存空間已滿！"); 
    }
}

window.handleDelete = (id, fromDetail = false) => {
    if(confirm("確定刪除？\n(若陣容中有用到此角色，將會自動從槽位拔除)")) { 
        db = db.filter(i => i.id != id); 
        
        currentTeamCookies = currentTeamCookies.map(val => val == id ? "" : val);
        currentTeamPets = currentTeamPets.map(val => val == id ? "" : val);
        
        localStorage.setItem('myDB', JSON.stringify(db)); 
        
        if (fromDetail) {
            showPage('page-library');
        } else {
            renderAll(); 
        }
    }
};

function renderTeamUI() {
    const generateSlotsHTML = (arr, type) => {
        return arr.map((id, idx) => {
            const item = db.find(x => x.id == id); 
            if (item) {
                return `<div class="team-slot filled" onclick="openSelectModal('${type}', ${idx})">
                            <span class="slot-num">${idx+1}</span>
                            <img src="${item.img}">
                            <div class="slot-name">${item.name}</div>
                        </div>`;
            } else {
                return `<div class="team-slot" onclick="openSelectModal('${type}', ${idx})">
                            <span class="slot-num">${idx+1}</span>
                            <div class="add-icon">+</div>
                        </div>`;
            }
        }).join('');
    };

    document.getElementById('cookieGrid').innerHTML = generateSlotsHTML(currentTeamCookies, 'cookie');
    document.getElementById('petGrid').innerHTML = generateSlotsHTML(currentTeamPets, 'pet');
}

function openSelectModal(type, index) {
    activeSlotType = type;
    activeSlotIndex = index;
    
    const title = type === 'cookie' ? `🍪 選擇餅乾 (位置 ${index+1})` : `🐾 選擇寵物 (位置 ${index+1})`;
    document.getElementById('selectModalTitle').innerText = title;

    const list = db.filter(i => i.type === type);
    list.sort((a, b) => b.rarity - a.rarity); 

    const currentArr = type === 'cookie' ? currentTeamCookies : currentTeamPets;

    document.getElementById('selectItemGrid').innerHTML = list.map(item => {
        const isUsed = currentArr.some(val => val == item.id) && currentArr[index] != item.id;

        if (isUsed) {
            return `<div class="select-item disabled" onclick="alert('此角色已在其他位置上陣！')">
                        <img src="${item.img}">
                        <div class="char-name">${item.name}</div>
                        <div class="char-rarity">已上陣</div>
                    </div>`;
        } else {
            return `<div class="select-item" onclick="chooseItemForSlot('${item.id}')">
                        <img src="${item.img}">
                        <div class="char-name">${item.name}</div>
                        <div class="char-rarity">${rarityMap[item.rarity]}</div>
                    </div>`;
        }
    }).join('');

    document.getElementById('selectItemDialog').showModal();
}

function chooseItemForSlot(id) {
    if (activeSlotType === 'cookie') {
        currentTeamCookies[activeSlotIndex] = id;
    } else {
        currentTeamPets[activeSlotIndex] = id;
    }
    document.getElementById('selectItemDialog').close();
    renderTeamUI();
}

function clearCurrentSlot() {
    if (activeSlotType === 'cookie') {
        currentTeamCookies[activeSlotIndex] = "";
    } else {
        currentTeamPets[activeSlotIndex] = "";
    }
    document.getElementById('selectItemDialog').close();
    renderTeamUI();
}

function clearEntireTeam() {
    if(confirm("確定要清空畫面上所有的配置嗎？(不會刪除存檔)")) {
        currentTeamCookies = new Array(12).fill("");
        currentTeamPets = new Array(3).fill("");
        document.getElementById('teamName').value = '';
        document.getElementById('savedTeamsList').value = '';
        currentLoadedTeamId = null; 
        renderTeamUI();
    }
}

function saveTeam() {
    const tName = document.getElementById('teamName').value.trim();
    if(!tName) return alert('請輸入陣容名稱！');

    if (currentLoadedTeamId) {
        const idx = teamsDB.findIndex(t => t.id == currentLoadedTeamId);
        if (idx > -1) {
            const oldName = teamsDB[idx].name;
            if (oldName !== tName) {
                const wantNew = confirm(`您修改了陣容名稱！\n\n【確定】👉 另存為全新的陣容「${tName}」\n【取消】👉 直接把原本的「${oldName}」改名覆蓋`);
                if (wantNew) {
                    currentLoadedTeamId = null;
                } else {
                    teamsDB[idx].name = tName; 
                    teamsDB[idx].cookies = [...currentTeamCookies];
                    teamsDB[idx].pets = [...currentTeamPets];
                    localStorage.setItem('myTeams', JSON.stringify(teamsDB));
                    alert('陣容改名並更新成功！');
                    renderTeamsDropdown();
                    document.getElementById('savedTeamsList').value = currentLoadedTeamId; 
                    return;
                }
            } else {
                teamsDB[idx].cookies = [...currentTeamCookies];
                teamsDB[idx].pets = [...currentTeamPets];
                localStorage.setItem('myTeams', JSON.stringify(teamsDB));
                alert('陣容更新成功！');
                return; 
            }
        }
    }

    const existingIdx = teamsDB.findIndex(t => t.name === tName);
    if (existingIdx > -1) {
        if (confirm(`名稱為「${tName}」的陣容已存在，要覆蓋它嗎？`)) {
            teamsDB[existingIdx].cookies = [...currentTeamCookies];
            teamsDB[existingIdx].pets = [...currentTeamPets];
            currentLoadedTeamId = teamsDB[existingIdx].id; 
        } else return;
    } else {
        const newId = Date.now().toString();
        teamsDB.push({ id: newId, name: tName, cookies: [...currentTeamCookies], pets: [...currentTeamPets] });
        currentLoadedTeamId = newId; 
    }
    
    localStorage.setItem('myTeams', JSON.stringify(teamsDB));
    alert('新陣容儲存成功！');
    renderTeamsDropdown();
    document.getElementById('savedTeamsList').value = currentLoadedTeamId; 
}

function renderTeamsDropdown() {
    const select = document.getElementById('savedTeamsList');
    if (!select) return;
    select.innerHTML = '<option value="">-- 讀取已儲存的陣容 --</option>' + 
                       teamsDB.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function loadTeam() {
    const tId = document.getElementById('savedTeamsList').value;
    if (!tId) {
        currentTeamCookies = new Array(12).fill("");
        currentTeamPets = new Array(3).fill("");
        document.getElementById('teamName').value = '';
        currentLoadedTeamId = null;
        renderTeamUI();
        return;
    }

    const team = teamsDB.find(t => t.id == tId); 
    if (!team) return;

    currentLoadedTeamId = team.id; 
    document.getElementById('teamName').value = team.name;

    currentTeamCookies = new Array(12).fill("");
    if (team.cookies) team.cookies.forEach((val, idx) => { if(idx < 12) currentTeamCookies[idx] = val || ""; });
    
    currentTeamPets = new Array(3).fill("");
    if (team.pets) team.pets.forEach((val, idx) => { if(idx < 3) currentTeamPets[idx] = val || ""; });

    renderTeamUI();
}

function deleteTeam() {
    const tId = document.getElementById('savedTeamsList').value;
    if (!tId) return alert('請先從下拉選單選擇一個陣容');

    const team = teamsDB.find(t => t.id == tId); 
    if (confirm(`確定要刪除陣容「${team.name}」嗎？`)) {
        teamsDB = teamsDB.filter(t => t.id != tId); 
        localStorage.setItem('myTeams', JSON.stringify(teamsDB));
        
        document.getElementById('teamName').value = '';
        currentTeamCookies = new Array(12).fill("");
        currentTeamPets = new Array(3).fill("");
        currentLoadedTeamId = null;
        
        renderTeamsDropdown();
        renderTeamUI();
    }
}

function exportFile() {
    const backupData = { items: db, teams: teamsDB };
    const jsonString = JSON.stringify(backupData);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const d = new Date();
    const timeStr = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`;
    a.download = `cookie_backup_${timeStr}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFile() {
    const fileInput = document.getElementById('backupFileInput');
    const file = fileInput.files[0];
    
    if (!file) return alert("請先選擇備份檔案 (.json)");
    
    if (confirm("這將會覆蓋現有的所有圖鑑與陣容資料，確定要還原嗎？")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                
                if (Array.isArray(parsed)) {
                    db = parsed.map(item => ({...item, id: item.id.toString()}));
                    teamsDB = []; 
                } else {
                    db = (parsed.items || []).map(item => ({...item, id: item.id.toString()}));
                    teamsDB = parsed.teams || [];
                }
                
                localStorage.setItem('myDB', JSON.stringify(db)); 
                localStorage.setItem('myTeams', JSON.stringify(teamsDB)); 
                
                currentTeamCookies = new Array(12).fill("");
                currentTeamPets = new Array(3).fill("");
                currentLoadedTeamId = null;
                
                renderAll(); 
                alert("資料還原成功！");
                fileInput.value = ''; 
            } catch (err) {
                alert("檔案格式錯誤或損毀！");
            }
        };
        reader.readAsText(file);
    }
}

renderAll();

/* --- 密碼保護功能 --- */
function checkPassword(event) {
    const block = document.getElementById('addCharacterBlock');
    
    if (!block.open) {
        event.preventDefault(); 
        
        const pwd = prompt("請輸入管理員密碼以新增角色：");
        
        if (pwd === "1357986420") { 
            block.open = true; 
        } else if (pwd !== null) {
            alert("密碼錯誤，拒絕存取！"); 
        }
    }
}

/* ========================================= */
/* 🕵️‍♂️ 隱藏後端：IP 紀錄系統 (含設備辨識、連點與密碼) */
/* ========================================= */

// 🌟 新增：設備翻譯機
function getDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "📱 Apple iPhone";
    if (/iPad/i.test(ua)) return "📱 Apple iPad";
    if (/Android/i.test(ua)) {
        // 嘗試抓取 Android 括號內的具體型號 (例如 SM-A5360)
        const match = ua.match(/Android[^;]*; ([^;)]+)/);
        return match ? `📱 Android (${match[1].trim()})` : "📱 Android 設備";
    }
    if (/Windows NT/i.test(ua)) return "💻 Windows PC";
    if (/Mac OS X/i.test(ua)) return "💻 Mac 電腦";
    if (/Linux/i.test(ua)) return "🐧 Linux 設備";
    return "❓ 未知設備";
}

// 1. 網頁載入時，自動抓取當下 IP 與設備並儲存
async function recordIP() {
    try {
        let res = await fetch('https://api.ipify.org?format=json');
        let data = await res.json();
        
        let history = JSON.parse(localStorage.getItem('ipHistory')) || [];
        let now = new Date();
        let timeString = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        
        let deviceStr = getDeviceName(); // 取得設備名稱

        // 如果最後一筆紀錄的 IP 和設備跟現在一樣，就不重複紀錄以免洗版
        if (history.length > 0 && history[0].ip === data.ip && history[0].device === deviceStr) {
            return;
        }

        // 儲存 IP、時間，以及新加入的設備資訊
        history.unshift({ ip: data.ip, time: timeString, device: deviceStr });
        
        if(history.length > 20) history.length = 20; 
        
        localStorage.setItem('ipHistory', JSON.stringify(history));
    } catch(e) { 
        console.log('連線失敗，無法記錄 IP'); 
    }
}

// 2. 連點 5 次觸發器
let adminClickCount = 0;
let adminClickTimer = null;

function handleAdminClick() {
    adminClickCount++; 
    
    clearTimeout(adminClickTimer);
    adminClickTimer = setTimeout(() => {
        adminClickCount = 0; 
    }, 2000);

    if (adminClickCount >= 5) {
        adminClickCount = 0; 
        clearTimeout(adminClickTimer);
        
        const pwd = prompt("🕵️‍♂️ 開發者模式：請輸入後端管理員密碼：");
        
        if (pwd === "1357986420") { 
            openAdmin(); 
        } else if (pwd !== null) {
            alert("存取拒絕：密碼錯誤！");
        }
    }
}

// 3. 打開控制台並顯示紀錄 (加上設備資訊)
function openAdmin() {
    const list = JSON.parse(localStorage.getItem('ipHistory')) || [];
    const container = document.getElementById('ipHistoryList');
    
    if (list.length === 0) {
        container.innerHTML = "尚無存取紀錄。";
    } else {
        // 在這裡把 device 印出來
        container.innerHTML = list.map(log => 
            `<div style="border-bottom: 1px dashed #ccc; padding: 6px 0;">
                <span style="color: #1976D2; font-weight: bold;">[${log.time}]</span><br>
                📡 IP: ${log.ip}<br>
                <span style="color: #d32f2f; font-weight: bold;">${log.device || "❓ 未知設備"}</span>
            </div>`
        ).join('');
    }
    
    document.getElementById('adminDialog').showModal();
}

// 啟動紀錄器
recordIP();
