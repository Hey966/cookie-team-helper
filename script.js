let db = JSON.parse(localStorage.getItem('myDB')) || [];
let teamsDB = JSON.parse(localStorage.getItem('myTeams')) || []; 

let currentTeamCookies = new Array(12).fill("");
let currentTeamPets = new Array(3).fill("");

let currentLoadedTeamId = null; 

let activeSlotType = ""; 
let activeSlotIndex = -1;
let editId = null;

const rarityMap = ['','C','U','R','SR','SSR','TSSR'];

function showPage(p) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(p).classList.add('active');
    renderAll();
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
    renderAll();
}

function renderAll() {
    const order = document.getElementById('sortOrder').value || 'high-low';
    let cookies = db.filter(i => i.type === 'cookie');
    let pets = db.filter(i => i.type === 'pet');
    
    const sortFunc = (a, b) => order === 'high-low' ? b.rarity - a.rarity : a.rarity - b.rarity;
    cookies.sort(sortFunc); pets.sort(sortFunc);

    document.getElementById('cookieCount').innerText = cookies.length;
    document.getElementById('petCount').innerText = pets.length;

    const generateCards = (list) => list.map(i => `
        <div class="item-card"><img src="${i.img}"><div style="flex:1">
            <b>${i.name} (${rarityMap[i.rarity]})</b><br>
            <button class="btn-sm" style="background:#2196F3;" onclick="openEdit('${i.id}')">編輯</button>
            <button class="btn-sm btn-del" onclick="handleDelete('${i.id}')">刪除</button>
        </div></div>`).join('');

    let listHtml = '';
    if (cookies.length > 0) listHtml += `<div class="list-header">🍪 餅乾區</div>` + generateCards(cookies);
    if (pets.length > 0) listHtml += `<div class="list-header">🐾 寵物區</div>` + generateCards(pets);
    if (!listHtml) listHtml = `<div style="text-align:center; color:#999; margin-top:20px;">尚無資料。</div>`;
    document.getElementById('libraryList').innerHTML = listHtml;
    
    renderTeamUI(); 
    renderTeamsDropdown(); 
    updateStorageInfo();
}

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

/* 🌟 核心升級：智慧判定「另存新檔」與「改名」 */
function saveTeam() {
    const tName = document.getElementById('teamName').value.trim();
    if(!tName) return alert('請輸入陣容名稱！');

    // 如果目前有載入陣容 (處於編輯模式)
    if (currentLoadedTeamId) {
        const idx = teamsDB.findIndex(t => t.id == currentLoadedTeamId);
        if (idx > -1) {
            const oldName = teamsDB[idx].name;
            
            // 判斷玩家是否「修改了名稱」
            if (oldName !== tName) {
                const wantNew = confirm(`您修改了陣容名稱！\n\n【確定】👉 另存為全新的陣容「${tName}」\n【取消】👉 直接把原本的「${oldName}」改名覆蓋`);
                
                if (wantNew) {
                    // 選擇另存新檔：解除追蹤，讓系統走最下方的新增邏輯
                    currentLoadedTeamId = null;
                } else {
                    // 選擇改名覆蓋
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
                // 名稱沒改：直接靜默更新覆蓋
                teamsDB[idx].cookies = [...currentTeamCookies];
                teamsDB[idx].pets = [...currentTeamPets];
                localStorage.setItem('myTeams', JSON.stringify(teamsDB));
                alert('陣容更新成功！');
                return; 
            }
        }
    }

    // --- 以下為新增陣容邏輯 (包含上面另存新檔跳過來的) ---
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

function openEdit(id) {
    const item = db.find(x => x.id == id); 
    editId = id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editRarity').value = item.rarity;
    document.getElementById('editImg').value = ''; 
    document.getElementById('editDialog').showModal();
}

async function confirmEdit() {
    const idx = db.findIndex(i => i.id == editId); 
    db[idx].name = document.getElementById('editName').value;
    db[idx].rarity = parseInt(document.getElementById('editRarity').value);
    const f = document.getElementById('editImg').files[0];
    if (f) db[idx].img = await resizeImage(f); 
    try { localStorage.setItem('myDB', JSON.stringify(db)); document.getElementById('editDialog').close(); renderAll(); } 
    catch (e) { alert("⚠️ 儲存空間已滿！"); }
}

window.handleDelete = (id) => {
    if(confirm("確定刪除？(若陣容中有用到此餅乾，將會自動從槽位移除)")) { 
        db = db.filter(i => i.id != id); 
        
        currentTeamCookies = currentTeamCookies.map(val => val == id ? "" : val);
        currentTeamPets = currentTeamPets.map(val => val == id ? "" : val);
        
        localStorage.setItem('myDB', JSON.stringify(db)); 
        renderAll(); 
    }
};

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
