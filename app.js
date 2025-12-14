// ==========================================
// 1. IMPORTS DES LIBRAIRIES
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CORRECTION PDF ---
import jsPDF from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";
import autoTableModule from "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm";

// On "greffe" le module autotable sur jsPDF au démarrage
autoTableModule.applyPlugin(jsPDF);
// ==========================================
// 2. CONFIGURATION FIREBASE
// ==========================================
const firebaseConfig = { 
    apiKey: "AIzaSyC70c8hVhGU7uFJad-Su2CMrm-TCxlbsoM", 
    authDomain: "proressources-3dab4.firebaseapp.com", 
    projectId: "proressources-3dab4", 
    storageBucket: "proressources-3dab4.firebasestorage.app", 
    messagingSenderId: "940538561110", 
    appId: "1:940538561110:web:f8ca7e1cbc8e73b02c31f7" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const ADMIN_EMAIL = "3d.build.007@gmail.com";

// ==========================================
// 3. VARIABLES GLOBALES
// ==========================================
let currentUser = null;
let fournisseursData = [];
let biblioData = [];
let triState = { col: 'nom', sens: 1 };
let userFavorites = new Set();
let monProjet = JSON.parse(localStorage.getItem('monProjet')) || [];
let editModeId = null;

console.log("App chargée. Mode Module.");

// ==========================================
// 4. FONCTIONS DE L'INTERFACE (UI)
// ==========================================

// Fonction pour changer les onglets
window.changerOnglet = function(onglet) {
    ['annuaire', 'outils', 'biblio', 'admin', 'favoris'].forEach(id => {
        const sect = document.getElementById('section-' + id);
        const btn = document.getElementById('btn-' + id);
        if (sect) sect.style.display = 'none';
        if (btn) btn.classList.remove('active');
    });
    const targetSect = document.getElementById('section-' + onglet);
    const targetBtn = document.getElementById('btn-' + onglet);
    if (targetSect) targetSect.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
    
    if (onglet === 'favoris') renderFavoritesPage();
}

// Ouvrir le visualiseur 3D
window.open3DViewer = function(url) {
    const viewer = document.getElementById('viewer3d');
    viewer.src = url;
    const modal = new bootstrap.Modal(document.getElementById('modal3D'));
    modal.show();
}

// Gestion des Pubs
function toggleAds(show) {
    const d = show ? 'block' : 'none';
    document.getElementById('ad-left').style.display = d;
    document.getElementById('ad-right').style.display = d;
}

// Mise à jour de l'affichage (Connecté / Déconnecté)
function updateUIState(isLoggedIn, user) {
    const logOutView = document.getElementById('logged-out-view');
    const logInView = document.getElementById('logged-in-view');
    const authWall = document.getElementById('auth-wall');
    const biblioContent = document.getElementById('biblio-content');

    if (isLoggedIn) {
        logOutView.style.display = 'none';
        logInView.style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName.split(' ')[0];
        document.getElementById('user-photo').src = user.photoURL;
        if(authWall) authWall.style.display = 'none';
        if(biblioContent) biblioContent.style.display = 'block';
        loadBibliotheque();
    } else {
        logOutView.style.display = 'block';
        logInView.style.display = 'none';
        if(authWall) authWall.style.display = 'block';
        if(biblioContent) biblioContent.style.display = 'none';
    }
}

// ==========================================
// 5. CALCULATRICES (MATHS)
// ==========================================

window.calcPoids = function() { 
    const L = (parseFloat(document.getElementById('calc-L').value)||0)/1000;
    const l = (parseFloat(document.getElementById('calc-l').value)||0)/1000;
    const ep = (parseFloat(document.getElementById('calc-ep').value)||0)/1000;
    const mat = parseFloat(document.getElementById('calc-mat').value)||750;
    document.getElementById('res-poids').innerText = (L*l*ep*mat).toFixed(2); 
}

window.calcSurf = function() { 
    const L = parseFloat(document.getElementById('surf-L').value)||0;
    const H = parseFloat(document.getElementById('surf-H').value)||0;
    const d = parseFloat(document.getElementById('surf-deduct').value)||0;
    document.getElementById('res-surf').innerText = Math.max(0, (L*H)-d).toFixed(2); 
}

window.convInchToMm = function() { document.getElementById('conv-mm').value = (parseFloat(document.getElementById('conv-inch').value)*25.4).toFixed(2); }
window.convMmToInch = function() { document.getElementById('conv-inch').value = (parseFloat(document.getElementById('conv-mm').value)/25.4).toFixed(3); }

window.calcEscalier = function() {
    const ht = parseFloat(document.getElementById('esc-ht').value);
    const type = document.getElementById('esc-type').value;
    const large = parseFloat(document.getElementById('esc-largeur').value);
    let rec = parseFloat(document.getElementById('esc-rec').value);
    const tr = parseFloat(document.getElementById('esc-tremie').value)||0;
    const ep = parseFloat(document.getElementById('esc-dalle').value)||0;
    const box = document.querySelector('#esc-ht').closest('.card-custom').querySelector('.result-box');
    
    if(!ht){
        document.getElementById('esc-res-titre').innerHTML="..."; 
        box.style.borderLeft="none"; 
        document.getElementById('esc-details').style.display="none"; 
        return;
    }
    
    let nb = Math.max(2, Math.round(ht/175)); 
    let h = ht/nb;
    let g = (rec>0)? rec/(nb-1) : 630-(2*h); 
    if(!rec) rec=g*(nb-1);
    
    let pas=(2*h)+g;
    let status="success"; 
    if(pas<570 || pas>670) status="danger"; else if(pas<600 || pas>650) status="warning";
    
    document.getElementById('esc-details').style.display="block";
    document.getElementById('res-angle').innerText = (Math.atan(h/g)*(180/Math.PI)).toFixed(1)+"°";
    
    let sol=rec;
    let solExt = (type==='L' && large>0) ? sol+(large*0.785) : sol;
    let limInt=Math.sqrt(Math.pow(ht,2)+Math.pow(sol,2));
    let limExt=Math.sqrt(Math.pow(ht,2)+Math.pow(solExt,2));
    
    document.getElementById('res-limon-int').innerText = ((limInt+300)/1000).toFixed(2)+" m";
    document.getElementById('res-limon-ext').innerText = ((limExt+300)/1000).toFixed(2)+" m";
    
    if(tr>0 && ep>0) { 
        document.getElementById('esc-echappee-box').style.display="block"; 
        let dist=sol-tr;
        let ech=(dist<0)?9999 : ht-(Math.ceil(dist/g)*h)-ep; 
        document.getElementById('res-echappee-val').innerText = (ech>2500)?"∞":(ech/1000).toFixed(2)+" m"; 
    } else {
        document.getElementById('esc-echappee-box').style.display="none";
    }
    document.getElementById('esc-res-titre').innerHTML = `${nb} hauteurs / ${nb-1} marches`; 
    document.getElementById('esc-res-txt').innerHTML = `h: ${h.toFixed(1)} | g: ${g.toFixed(1)}`; 
    box.style.borderLeft = `5px solid ${status==='success'?'#198754':(status==='warning'?'#ffc107':'#dc3545')}`;
}

window.calcPlafond = function() {
    const L=parseFloat(document.getElementById('plaf-L').value);
    const l=parseFloat(document.getElementById('plaf-l').value);
    const type=document.getElementById('plaf-type').value;
    const box=document.querySelector('#plaf-L').closest('.card-custom').querySelector('.result-box');
    if(!L || !l){
        document.getElementById('plaf-res-titre').innerHTML="..."; box.style.borderLeft="none"; document.getElementById('plaf-matos').style.display="none"; return;
    }
    let dL=(type==="1200-600")?1200:600, dl=600; 
    let nbL=Math.ceil(L/dL), nbl=Math.ceil(l/dl);
    document.getElementById('plaf-res-titre').innerText = ((L*l)/1000000).toFixed(2)+" m²";
    box.style.borderLeft="5px solid #0d6efd"; document.getElementById('plaf-matos').style.display="flex";
    document.getElementById('qty-dalles').innerText = nbL*nbl;
    document.getElementById('qty-porteurs').innerText = Math.ceil((Math.ceil((Math.min(L,l)/1000)/1.2)*Math.max(L,l)/1000)/3.6);
    document.getElementById('qty-cornieres').innerText = Math.ceil(((L+l)*2/1000)/3);
    document.getElementById('qty-ent-1200').innerText = Math.ceil(((L*l/1000000)*1.7)/1.2);
    document.getElementById('qty-ent-600').innerText = (type==="600-600")?Math.ceil(((L*l/1000000)*0.85)/0.6):0;
}

window.calcCarrelage = function() {
    const L=parseFloat(document.getElementById('carr-L').value);
    const l=parseFloat(document.getElementById('carr-l').value);
    const tL=parseFloat(document.getElementById('tile-L').value);
    const tl=parseFloat(document.getElementById('tile-l').value);
    const box=document.querySelector('#carr-L').closest('.card-custom').querySelector('.result-box');
    if(!L||!l||!tL||!tl){ box.style.borderLeft="none"; document.getElementById('carr-details').style.display="none"; return;}
    let nbL=Math.ceil(L/(tL*10)), nbl=Math.ceil(l/(tl*10)); 
    let surf=(L*l)/1000000, perim=(L+l)*2/1000;
    let colle = Math.ceil(surf * (Math.max(tL,tl)>=40 ? 8 : 4.5) * 1.10);
    document.getElementById('carr-res-titre').innerText = "Surface : " + surf.toFixed(2) + " m²";
    box.style.borderLeft="5px solid #0dcaf0"; document.getElementById('carr-details').style.display="flex";
    document.getElementById('res-nb-carreaux').innerText = Math.ceil((nbL*nbl)*1.05);
    document.getElementById('res-grille-info').innerText = `Grille: ${nbL} x ${nbl}`;
    document.getElementById('res-colle').innerText = colle;
    document.getElementById('res-plinthes-nb').innerText = Math.ceil((Math.ceil(perim/(Math.max(tL,tl)/100)))*1.05);
    document.getElementById('res-plinthes-ml').innerText = perim.toFixed(2)+" m";
}

// ==========================================
// 6. GESTION DU PROJET & PDF
// ==========================================

window.saveProjectName = function() { localStorage.setItem('nomProjet', document.getElementById('project-name').value); }

window.ajouterAuProjet = function(outil) {
    Swal.fire({
        title: editModeId ? 'Modifier la zone ?' : 'Nom de la zone ?',
        input: 'text', 
        inputValue: editModeId ? monProjet.find(i => i.id === editModeId).zone : '', 
        showCancelButton: true, 
        confirmButtonText: editModeId ? 'Mettre à jour' : 'Ajouter'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const zone = result.value; 
            let details="", rawData={}, inputData={};
            
            if (outil === 'Escalier') {
                inputData = { type: document.getElementById('esc-type').value, largeur: document.getElementById('esc-largeur').value, ht: document.getElementById('esc-ht').value, rec: document.getElementById('esc-rec').value, tremie: document.getElementById('esc-tremie').value, dalle: document.getElementById('esc-dalle').value };
                details = `${inputData.type} | H: ${inputData.ht}mm`; rawData = { type: 'Escalier' }; 
            } else if (outil === 'Plafond') {
                inputData = { L: document.getElementById('plaf-L').value, l: document.getElementById('plaf-l').value, type: document.getElementById('plaf-type').value };
                details = `Surf: ${document.getElementById('plaf-res-titre').innerText} | ${inputData.type}`;
                rawData = { type: 'Plafond', dalles: parseInt(document.getElementById('qty-dalles').innerText), porteurs: parseInt(document.getElementById('qty-porteurs').innerText), cornieres: parseInt(document.getElementById('qty-cornieres').innerText), ent1200: parseInt(document.getElementById('qty-ent-1200').innerText), ent600: parseInt(document.getElementById('qty-ent-600').innerText) };
            } else if (outil === 'Carrelage') {
                inputData = { L: document.getElementById('carr-L').value, l: document.getElementById('carr-l').value, tileL: document.getElementById('tile-L').value, tilel: document.getElementById('tile-l').value };
                details = `Surf: ${document.getElementById('carr-res-titre').innerText.replace('Surface : ','')} | ${inputData.tileL}x${inputData.tilel}`;
                rawData = { type: 'Carrelage', carreaux: parseInt(document.getElementById('res-nb-carreaux').innerText), colle: parseInt(document.getElementById('res-colle').innerText), plinthes: parseInt(document.getElementById('res-plinthes-nb').innerText) };
            }
            
            if (editModeId) {
                const index = monProjet.findIndex(i => i.id === editModeId);
                monProjet[index] = { id: editModeId, outil, zone, details, rawData, inputData }; 
                editModeId = null;
                const btn = document.getElementById('btn-add-'+outil);
                if(btn) { btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Ajouter au projet'; btn.classList.remove('btn-warning'); btn.classList.add('btn-outline-dark'); }
            } else { 
                monProjet.push({ id: Date.now(), outil, zone, details, rawData, inputData }); 
            }
            saveAndRender();
        }
    });
}

window.chargerPourModification = function(id) {
    const item = monProjet.find(i => i.id === id); if (!item) return; editModeId = id; 
    if (item.outil === 'Escalier') { document.getElementById('esc-type').value = item.inputData.type; document.getElementById('esc-largeur').value = item.inputData.largeur; document.getElementById('esc-ht').value = item.inputData.ht; document.getElementById('esc-rec').value = item.inputData.rec; calcEscalier(); document.getElementById('card-Escalier').scrollIntoView(); }
    else if (item.outil === 'Plafond') { document.getElementById('plaf-L').value = item.inputData.L; document.getElementById('plaf-l').value = item.inputData.l; document.getElementById('plaf-type').value = item.inputData.type; calcPlafond(); document.getElementById('card-Plafond').scrollIntoView(); }
    else if (item.outil === 'Carrelage') { document.getElementById('carr-L').value = item.inputData.L; document.getElementById('carr-l').value = item.inputData.l; document.getElementById('tile-L').value = item.inputData.tileL; document.getElementById('tile-l').value = item.inputData.tilel; calcCarrelage(); document.getElementById('card-Carrelage').scrollIntoView(); }
    
    const btn = document.getElementById('btn-add-' + item.outil);
    if(btn) { btn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Mettre à jour'; btn.classList.remove('btn-outline-dark'); btn.classList.add('btn-warning'); }
}

window.supprimerLigne = function(id) { 
    monProjet = monProjet.filter(item => item.id !== id); 
    if(editModeId === id) editModeId = null; 
    saveAndRender(); 
}

function saveAndRender() { 
    monProjet.sort((a, b) => a.outil.localeCompare(b.outil)); 
    localStorage.setItem('monProjet', JSON.stringify(monProjet)); 
    updateProjetTable(); 
    calculerTotaux(); 
}

function updateProjetTable() {
    const tbody = document.getElementById('projet-body'); tbody.innerHTML = "";
    if (monProjet.length === 0) { document.getElementById('empty-projet-msg').style.display = "block"; document.getElementById('zone-totaux').style.display = "none"; }
    else {
        document.getElementById('empty-projet-msg').style.display = "none"; document.getElementById('zone-totaux').style.display = "block";
        monProjet.forEach((item) => {
            let badgeColor = 'bg-secondary'; let matTxt = "";
            if(item.outil === 'Escalier') badgeColor = 'bg-danger';
            if(item.outil === 'Plafond') { badgeColor = 'bg-primary'; matTxt = `${item.rawData.dalles} Dalles, ${item.rawData.porteurs} Porteurs`; }
            if(item.outil === 'Carrelage') { badgeColor = 'bg-info text-dark'; matTxt = `${item.rawData.carreaux} Carreaux, ${item.rawData.colle}kg Colle`; }
            let activeClass = (editModeId === item.id) ? "table-warning" : "";
            tbody.innerHTML += `<tr class="${activeClass}"><td><span class="badge ${badgeColor}">${item.outil}</span></td><td class="fw-bold">${item.zone}</td><td class="small text-muted">${item.details}</td><td class="small fw-bold">${matTxt}</td><td class="text-end"><button onclick="chargerPourModification(${item.id})" class="btn btn-sm text-primary me-1"><i class="bi bi-pencil-fill"></i></button><button onclick="supprimerLigne(${item.id})" class="btn btn-sm text-danger"><i class="bi bi-trash-fill"></i></button></td></tr>`;
        });
    }
}

function calculerTotaux() {
    const container = document.getElementById('container-totaux'); container.innerHTML = "";
    let t = { plafond: { dalles:0, porteurs:0, cornieres:0, ent1200:0, ent600:0 }, carrelage: { carreaux:0, colle:0, plinthes:0 } };
    let hasP = false, hasC = false;
    monProjet.forEach(item => {
        if (item.outil === 'Plafond') { hasP=true; t.plafond.dalles+=item.rawData.dalles; t.plafond.porteurs+=item.rawData.porteurs; t.plafond.cornieres+=item.rawData.cornieres; t.plafond.ent1200+=item.rawData.ent1200; t.plafond.ent600+=item.rawData.ent600; }
        else if (item.outil === 'Carrelage') { hasC=true; t.carrelage.carreaux+=item.rawData.carreaux; t.carrelage.colle+=item.rawData.colle; t.carrelage.plinthes+=item.rawData.plinthes; }
    });
    if(hasC) container.innerHTML += `<div class="col-md-6"><div class="p-2 border rounded bg-white h-100 border-start border-4 border-info"><strong class="d-block text-info mb-1">TOTAL CARRELAGE</strong><ul class="list-unstyled small m-0"><li>• ${t.carrelage.carreaux} Carreaux</li><li>• ${t.carrelage.colle} kg Colle</li><li>• ${t.carrelage.plinthes} Plinthes</li></ul></div></div>`;
    if(hasP) container.innerHTML += `<div class="col-md-6"><div class="p-2 border rounded bg-white h-100 border-start border-4 border-primary"><strong class="d-block text-primary mb-1">TOTAL PLAFOND</strong><ul class="list-unstyled small m-0 row"><li class="col-6">• ${t.plafond.dalles} Dalles</li><li class="col-6">• ${t.plafond.porteurs} Porteurs</li><li class="col-6">• ${t.plafond.cornieres} Cornières</li><li class="col-6">• ${t.plafond.ent1200} Ent. 1200</li><li class="col-6">• ${t.plafond.ent600} Ent. 600</li></ul></div></div>`;
}

// -------------------------------------------------------------
// FONCTION PDF CORRIGÉE (Totaux alignés + lignes + pied de page)
// -------------------------------------------------------------
window.genererPDF = function () {
    if (monProjet.length === 0) {
        Swal.fire("Vide", "Rien à exporter", "warning");
        return;
    }

    try {
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const projectName =
            document.getElementById("project-name").value || "Mon Chantier";
        const date = new Date().toLocaleDateString();

        // ======================
        // TITRE
        // ======================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text(projectName, 14, 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Date : ${date}`, 14, 26);

        // ======================
        // DONNÉES TABLEAU
        // ======================
        const rows = monProjet.map(item => {
            let materiaux = "-";

            if (item.outil === "Plafond") {
                materiaux =
                    `${item.rawData.dalles} Dalles, ` +
                    `${item.rawData.porteurs} Porteurs, ` +
                    `${item.rawData.cornieres} Cornières, ` +
                    `${item.rawData.ent1200 || 0} Entretoises 1200, ` +
                    `${item.rawData.ent600 || 0} Entretoises 600`;
            }

            if (item.outil === "Carrelage") {
                materiaux =
                    `${item.rawData.carreaux} Carreaux, ` +
                    `${item.rawData.colle} kg colle, ` +
                    `${item.rawData.plinthes} Plinthes`;
            }

            return [
                item.outil,
                item.zone,
                item.details,
                materiaux
            ];
        });

        // ======================
        // TABLEAU PRINCIPAL
        // ======================
        doc.autoTable({
            startY: 35,
            head: [["Lot", "Zone", "Détails", "Matériaux"]],
            body: rows,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 10,
                cellPadding: 4,
                lineWidth: 0.3,
                lineColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [30, 30, 30],
                textColor: 255,
                fontStyle: "bold"
            },
            alternateRowStyles: {
                fillColor: [212, 212, 212]
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 45 },
                2: { cellWidth: 110 },
                3: { cellWidth: 79 }
            },
            tableLineWidth: 0.5,
            tableLineColor: [0, 0, 0],
            didDrawPage: function () {
                drawFooter();
            }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        const totalWidth = 35 + 45 + 110 + 75; // largeur totale du tableau

        // ======================
        // CALCUL DES TOTAUX
        // ======================
        let totalCarrelage = { carreaux: 0, colle: 0, plinthes: 0 };
        let totalPlafond = { dalles: 0, porteurs: 0, cornieres: 0, ent1200: 0, ent600: 0 };

        monProjet.forEach(i => {
            if (i.outil === "Carrelage") {
                totalCarrelage.carreaux += i.rawData.carreaux;
                totalCarrelage.colle += i.rawData.colle;
                totalCarrelage.plinthes += i.rawData.plinthes;
            }
            if (i.outil === "Plafond") {
                totalPlafond.dalles += i.rawData.dalles;
                totalPlafond.porteurs += i.rawData.porteurs;
                totalPlafond.cornieres += i.rawData.cornieres;
                totalPlafond.ent1200 += i.rawData.ent1200 || 0;
                totalPlafond.ent600 += i.rawData.ent600 || 0;
            }
        });

        // ======================
        // RECTANGLES TOTAUX (CONTOUR ARRONDI)
        // ======================
        const boxWidth = totalWidth / 2 - 5; // pour aligner avec le tableau
        const lineHeight = 6;
        let x = 14;
        let yTotaux = finalY;

        function drawTotalBox(x, y, title, color, lines) {
            const boxHeight = 14 + (lines.length * lineHeight);

            // Contour arrondi
            doc.setDrawColor(...color);
            doc.setLineWidth(1);
            doc.roundedRect(x, y, boxWidth, boxHeight, 4, 4, "S");

            // Titre
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(...color);
            doc.text(title, x + 5, y + 9);

            // Contenu
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0);

            lines.forEach((txt, i) => {
                doc.text("• " + txt, x + 5, y + 15 + i * lineHeight);
            });

            return boxHeight;
        }

        // CARRELAGE
        if (totalCarrelage.carreaux > 0) {
            const h = drawTotalBox(
                x,
                yTotaux,
                "TOTAL CARRELAGE",
                [13, 202, 240],
                [
                    `${totalCarrelage.carreaux} Carreaux`,
                    `${totalCarrelage.colle} kg Colle`,
                    `${totalCarrelage.plinthes} Plinthes`
                ]
            );
            x += boxWidth + 5;
        }

        // FAUX PLAFOND
        if (totalPlafond.dalles > 0) {
            drawTotalBox(
                x,
                yTotaux,
                "TOTAL FAUX PLAFOND",
                [13, 110, 253],
                [
                    `${totalPlafond.dalles} Dalles`,
                    `${totalPlafond.porteurs} Porteurs`,
                    `${totalPlafond.cornieres} Cornières`,
                    `${totalPlafond.ent1200} Entretoises 1200`,
                    `${totalPlafond.ent600} Entretoises 600`
                ]
            );
        }

        // ======================
        // PIED DE PAGE
        // ======================
        function drawFooter() {
            const pageCount = doc.getNumberOfPages();
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

            doc.setFontSize(9);
            doc.setTextColor(120);

            // Centre
            doc.text(
                "ProRessources © 2025",
                pageWidth / 2,
                pageHeight - 8,
                { align: "center" }
            );

            // Droite
            doc.text(
                `Page ${currentPage} / ${pageCount}`,
                pageWidth - 14,
                pageHeight - 8,
                { align: "right" }
            );
        }

        // Appliquer le footer
        drawFooter();

        // ======================
        // EXPORT PDF
        // ======================
        doc.save(`Projet_${projectName.replace(/\s+/g, "_")}.pdf`);

    } catch (e) {
        console.error(e);
        Swal.fire("Erreur PDF", e.message, "error");
    }
};




// ==========================================
// 7. AUTHENTIFICATION
// ==========================================

window.loginWithGoogle = async () => { try { await signInWithPopup(auth, provider); } catch(e){ Swal.fire("Erreur", e.message, "error"); } }
window.logout = async () => { await signOut(auth); location.reload(); }

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user; updateUIState(true, user); await loadFavorites();
        const isAdmin = user.email === ADMIN_EMAIL; const isLamache = user.email.endsWith("@lamache.org");
        const navAdmin = document.getElementById('nav-admin'); const navBiblio = document.getElementById('nav-biblio-li');
        if (isAdmin) { if(navAdmin) navAdmin.style.display = 'block'; if(navBiblio) navBiblio.style.display = 'block'; toggleAds(false); }
        else if (isLamache) { if(navAdmin) navAdmin.style.display = 'none'; if(navBiblio) navBiblio.style.display = 'none'; toggleAds(false); }
        else { if(navAdmin) navAdmin.style.display = 'none'; if(navBiblio) navBiblio.style.display = 'block'; toggleAds(true); }
        document.getElementById('nav-favoris-li').style.display = 'block';
        if(fournisseursData.length > 0) renderFournisseurs(fournisseursData);
    } else {
        currentUser = null; updateUIState(false, null); 
        document.getElementById('nav-admin').style.display = 'none'; document.getElementById('nav-biblio-li').style.display = 'none'; document.getElementById('nav-favoris-li').style.display = 'none'; 
        userFavorites.clear(); toggleAds(true);
        if(fournisseursData.length > 0) renderFournisseurs(fournisseursData);
    }
});

// ==========================================
// 8. CRUD (Admin & Chargement)
// ==========================================

window.trier = function(col) { if(triState.col === col) triState.sens *= -1; else { triState.col = col; triState.sens = 1; } fa(); }
window.toggleFavorite = async function(type, id) {
    if (!currentUser) { Swal.fire("Oups", "Connectez-vous !", "warning"); return; }
    const favId = currentUser.uid + "_" + id;
    if (userFavorites.has(id)) { try { await deleteDoc(doc(db, "favoris", favId)); userFavorites.delete(id); document.getElementById(`fav-btn-${id}`)?.classList.replace('bi-star-fill', 'bi-star'); document.getElementById(`fav-btn-${id}`)?.classList.remove('text-warning'); if(document.getElementById('section-favoris').style.display === 'block') renderFavoritesPage(); } catch(e) {} } 
    else { try { await setDoc(doc(db, "favoris", favId), { uid: currentUser.uid, itemId: id, type: type }); userFavorites.add(id); document.getElementById(`fav-btn-${id}`)?.classList.replace('bi-star', 'bi-star-fill'); document.getElementById(`fav-btn-${id}`)?.classList.add('text-warning'); } catch(e) {} }
}

async function loadFavorites() { if (!currentUser) return; const q = query(collection(db, "favoris"), where("uid", "==", currentUser.uid)); const qs = await getDocs(q); userFavorites.clear(); qs.forEach((d) => userFavorites.add(d.data().itemId)); fa(); fb(); }
async function loadFournisseurs(force=false) { if(!force && fournisseursData.length>0) return; const s = await getDocs(collection(db, "fournisseurs")); fournisseursData=[]; s.forEach(d=>fournisseursData.push({...d.data(), docId:d.id})); document.getElementById('loader-annuaire').style.display='none'; document.getElementById('table-annuaire-wrap').style.display='table'; renderFournisseurs(fournisseursData); }
function renderFournisseurs(data) { const b = document.getElementById("tableBody"); b.innerHTML=""; document.getElementById("stat-f-total").innerText=data.length; document.getElementById("stat-f-cat").innerText=[...new Set(data.map(i=>i.categorie))].length; const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL; if(data.length===0) b.innerHTML="<tr><td colspan='6' class='text-center p-4 text-muted'>Aucun résultat.</td></tr>"; data.forEach(i => { let badge='badge-gray'; if(i.categorie==='Quincaillerie') badge='badge-purple'; else if(i.categorie==='Bois') badge='badge-orange'; else if(i.categorie==='Isolation') badge='badge-green'; else if(['Électricité','Métal'].includes(i.categorie)) badge='badge-blue'; let btns = isAdmin ? `<button class="btn btn-sm btn-edit" onclick="editerFournisseur('${i.docId}')"><i class="bi bi-pencil-fill"></i></button><button class="btn btn-sm btn-delete" onclick="supprimerItem('fournisseurs', '${i.docId}')"><i class="bi bi-trash-fill"></i></button>` : ''; let starClass = userFavorites.has(i.docId) ? "bi-star-fill text-warning" : "bi-star"; let starBtn = currentUser ? `<i class="bi ${starClass} btn-fav" id="fav-btn-${i.docId}" onclick="toggleFavorite('fournisseurs', '${i.docId}')"></i>` : ''; b.innerHTML+=`<tr class="table-row-hover"><td class="ps-4 d-flex align-items-center">${starBtn}<span class="fw-bold text-dark">${i.nom||""}</span></td><td><span class="badge badge-soft ${badge}">${i.categorie||""}</span></td><td class="text-muted small">${i.desc||""}</td><td>${i.produit||""}</td><td class="text-end pe-4 admin-actions">${btns}<a href="${i.lien}" target="_blank" class="btn btn-visit btn-sm">Visiter</a></td></tr>`; }); }
async function loadBibliotheque(force=false) { if(!force && biblioData.length>0) return; const s = await getDocs(collection(db, "bibliotheque")); biblioData=[]; s.forEach(d=>biblioData.push({...d.data(), docId:d.id})); document.getElementById('loader-biblio').style.display='none'; document.getElementById('table-biblio-wrap').style.display='table'; renderBibliotheque(biblioData); }
function renderBibliotheque(data) { const b = document.getElementById("biblioBody"); b.innerHTML=""; document.getElementById("stat-b-total").innerText=data.length; const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL; if(data.length===0) b.innerHTML="<tr><td colspan='6' class='text-center p-4 text-muted'>Aucun fichier.</td></tr>"; data.forEach(i => { let log='background:#eee; color:#333;'; if(i.logiciel==='SolidWorks') log='background:#FFFBEB; color:#B45309; border:1px solid #FEF3C7;'; if(i.logiciel==='SketchUp') log='background:#EFF6FF; color:#1D4ED8; border:1px solid #DBEAFE;'; let btns = isAdmin ? `<button class="btn btn-sm btn-edit" onclick="editerBiblio('${i.docId}')"><i class="bi bi-pencil-fill"></i></button><button class="btn btn-sm btn-delete" onclick="supprimerItem('bibliotheque', '${i.docId}')"><i class="bi bi-trash-fill"></i></button>` : ''; let dl = i.prix===0 ? `<a href="${i.lien||'#'}" target="_blank" class="btn btn-sm btn-warning text-white fw-bold"><i class="bi bi-download"></i></a>` : `<button class="btn btn-sm btn-dark fw-bold">${i.prix} €</button>`; let starClass = userFavorites.has(i.docId) ? "bi-star-fill text-warning" : "bi-star"; let starBtn = currentUser ? `<i class="bi ${starClass} btn-fav" id="fav-btn-${i.docId}" onclick="toggleFavorite('biblio', '${i.docId}')"></i>` : ''; let visuBtn = i.lien3d ? `<button onclick="open3DViewer('${i.lien3d}')" class="btn btn-sm btn-info text-white me-2"><i class="bi bi-box"></i></button>` : ''; b.innerHTML+=`<tr class="table-row-hover"><td class="ps-4 d-flex align-items-center">${starBtn}<span class="fw-bold text-dark">${i.nom||""}</span></td><td><span class="badge" style="${log}">${i.logiciel}</span></td><td class="text-muted small">${i.desc||""}</td><td>${i.categorie||""}</td><td class="text-end pe-4 admin-actions">${btns}${visuBtn}${dl}</td></tr>`; }); }
function renderFavoritesPage() { const tbody = document.getElementById('favBody'); tbody.innerHTML = ""; let count = 0; fournisseursData.forEach(item => { if (userFavorites.has(item.docId)) { count++; tbody.innerHTML += `<tr><td class="fw-bold">${item.nom}</td><td><span class="badge badge-soft badge-blue">Fournisseur</span></td><td class="text-muted small">${item.desc}</td><td class="text-end"><a href="${item.lien}" target="_blank" class="btn btn-sm btn-outline-dark">Voir</a> <button onclick="toggleFavorite('fournisseurs', '${item.docId}')" class="btn btn-sm text-danger"><i class="bi bi-x-lg"></i></button></td></tr>`; } }); biblioData.forEach(item => { if (userFavorites.has(item.docId)) { count++; tbody.innerHTML += `<tr><td class="fw-bold">${item.nom}</td><td><span class="badge badge-soft badge-warning text-dark">3D</span></td><td class="text-muted small">${item.logiciel}</td><td class="text-end"><a href="${item.lien}" target="_blank" class="btn btn-sm btn-outline-dark">DL</a> <button onclick="toggleFavorite('biblio', '${item.docId}')" class="btn btn-sm text-danger"><i class="bi bi-x-lg"></i></button></td></tr>`; } }); if (count === 0) tbody.innerHTML = `<tr><td colspan="4" class="text-center p-5 text-muted"><i class="bi bi-star display-4 d-block mb-3"></i>Aucun favori.</td></tr>`; }

window.supprimerItem = async function(col, id) { Swal.fire({title:'Sûr ?', icon:'warning', showCancelButton:true, confirmButtonColor:'#d33'}).then(async (r) => { if (r.isConfirmed) { await deleteDoc(doc(db, col, id)); col === "fournisseurs" ? loadFournisseurs(true) : loadBibliotheque(true); Swal.fire('Supprimé', '', 'success'); } }) }
window.editerFournisseur = function(id) { const i = fournisseursData.find(x => x.docId === id); document.getElementById('adm-f-uid').value = i.docId; document.getElementById('adm-f-nom').value = i.nom; document.getElementById('adm-f-cat').value = i.categorie; document.getElementById('adm-f-desc').value = i.desc; document.getElementById('adm-f-prod').value = i.produit; document.getElementById('adm-f-lien').value = i.lien; document.getElementById('btn-save-f').innerText = "Modifier"; document.getElementById('btn-save-f').classList.replace('btn-dark', 'btn-warning'); changerOnglet('admin'); }
window.editerBiblio = function(id) { const i = biblioData.find(x => x.docId === id); document.getElementById('adm-b-uid').value = i.docId; document.getElementById('adm-b-nom').value = i.nom; document.getElementById('adm-b-log').value = i.logiciel; document.getElementById('adm-b-type').value = i.type; document.getElementById('adm-b-cat').value = i.categorie; document.getElementById('adm-b-desc').value = i.desc; document.getElementById('adm-b-lien').value = i.lien; document.getElementById('adm-b-visu').value = i.lien3d || ""; document.getElementById('adm-b-prix').value = i.prix; document.getElementById('btn-save-b').innerText = "Modifier"; document.getElementById('btn-save-b').classList.replace('btn-dark', 'btn-warning'); changerOnglet('admin'); }
window.resetAdminForms = function() { document.getElementById('formFournisseur').reset(); document.getElementById('adm-f-uid').value = ""; document.getElementById('btn-save-f').innerText="Ajouter"; document.getElementById('btn-save-f').classList.replace('btn-warning','btn-dark'); document.getElementById('formBiblio').reset(); document.getElementById('adm-b-uid').value = ""; document.getElementById('btn-save-b').innerText="Ajouter"; document.getElementById('btn-save-b').classList.replace('btn-warning','btn-dark'); }
window.sauvegarderFournisseur = async function(e) { e.preventDefault(); const uid = document.getElementById('adm-f-uid').value; const d = { nom: document.getElementById('adm-f-nom').value, categorie: document.getElementById('adm-f-cat').value, desc: document.getElementById('adm-f-desc').value, produit: document.getElementById('adm-f-prod').value, lien: document.getElementById('adm-f-lien').value }; try { if(uid) await updateDoc(doc(db, "fournisseurs", uid), d); else await addDoc(collection(db, "fournisseurs"), d); resetAdminForms(); loadFournisseurs(true); changerOnglet('annuaire'); Swal.fire("Succès", "", "success"); } catch(e){Swal.fire("Erreur",e.message,"error");} }
window.sauvegarderFichier = async function(e) { e.preventDefault(); const uid = document.getElementById('adm-b-uid').value; const d = { nom: document.getElementById('adm-b-nom').value, logiciel: document.getElementById('adm-b-log').value, type: document.getElementById('adm-b-type').value, categorie: document.getElementById('adm-b-cat').value, desc: document.getElementById('adm-b-desc').value, lien: document.getElementById('adm-b-lien').value, lien3d: document.getElementById('adm-b-visu').value, prix: Number(document.getElementById('adm-b-prix').value) }; try { if(uid) await updateDoc(doc(db, "bibliotheque", uid), d); else await addDoc(collection(db, "bibliotheque"), d); resetAdminForms(); loadBibliotheque(true); changerOnglet('biblio'); Swal.fire("Succès", "", "success"); } catch(e){Swal.fire("Erreur",e.message,"error");} }

const fa = () => { const s=document.getElementById("searchInput").value.toLowerCase(), t=document.getElementById("typeFilter").value; let f = fournisseursData.filter(i=>(i.nom||"").toLowerCase().includes(s) && (t===""||i.categorie===t)); f.sort((a,b)=>{ let va=(a[triState.col]||"").toLowerCase(), vb=(b[triState.col]||"").toLowerCase(); if(va<vb)return -1*triState.sens; if(va>vb)return 1*triState.sens; return 0; }); renderFournisseurs(f); };
if(document.getElementById("searchInput")) document.getElementById("searchInput").addEventListener("keyup", fa); if(document.getElementById("typeFilter")) document.getElementById("typeFilter").addEventListener("change", fa);
const fb = () => { const s=document.getElementById("searchBiblio").value.toLowerCase(), l=document.getElementById("filterLogiciel").value; renderBibliotheque(biblioData.filter(i=>(i.nom||"").toLowerCase().includes(s) && (l===""||i.logiciel===l))); };
if(document.getElementById("searchBiblio")) document.getElementById("searchBiblio").addEventListener("keyup", fb); if(document.getElementById("filterLogiciel")) document.getElementById("filterLogiciel").addEventListener("change", fb);

document.getElementById('project-name').value = localStorage.getItem('nomProjet') || "";
updateProjetTable();
loadFournisseurs();