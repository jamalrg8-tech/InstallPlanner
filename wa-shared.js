// Eurolux WA production tracker — shared data model + rendering, used by
// BOTH InstallPlanner.html (as the "WA Tracker" tab) and wa-tracker.html
// (the standalone, factory-facing page reached via a shared link). Keeping
// this logic in one file means both places always agree on what a row
// looks like, how it's rendered, and how a spreadsheet import is parsed —
// nothing here should assume which page it's running in.
//
// Everything is exposed under a single global, window.WA, so it never
// collides with either host page's own helpers of the same name (each
// host still has its own iso()/escText()/parseDateFlexible()/normHeader()
// for its own unrelated needs — this file keeps private copies rather
// than relying on globals from whichever page includes it).
(function(){
  "use strict";

  function pad2(n){ return (n<10?"0":"")+n; }
  function iso(y,m,d){ return y+"-"+pad2(m)+"-"+pad2(d); }
  function escAttr(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }
  function escText(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

  // Display format for the delivery date: day (no leading zero) / month (2
  // digits) / year, e.g. 5 July 2026 shows as "5/07/2026" — matches the
  // format used everywhere else in the planner.
  function fmtDateDisplay(isoStr){
    if (!isoStr) return "";
    var d = +isoStr.slice(8,10);
    return d+"/"+isoStr.slice(5,7)+"/"+isoStr.slice(0,4);
  }

  function normHeader(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }

  function parseDateFlexible(v){
    if (!v && v!==0) return "";
    if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth()+1, v.getDate());
    var s = String(v).trim();
    if (!s) return "";
    var iso8601 = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (iso8601) return iso(+iso8601[1], +iso8601[2], +iso8601[3]);
    var slashy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
    if (slashy){
      var a=+slashy[1], b=+slashy[2], y=+slashy[3];
      if (y<100) y += 2000;
      var day, mon;
      if (a>12){ day=a; mon=b; } else if (b>12){ day=b; mon=a; } else { day=a; mon=b; } // assume day-first (UAE convention)
      return iso(y, mon, day);
    }
    var d = new Date(s);
    if (!isNaN(d)) return iso(d.getFullYear(), d.getMonth()+1, d.getDate());
    return "";
  }

  function newRow(){
    return { id:"wa"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      no:"", jobNo:"", projectName:"", deliveryDate:"", delivered:"No", description:"",
      itemQty:"", scope:"", etaCoating:"", etaFabFrame:"", etaFabShutter:"" };
  }

  function normalizeRow(row){
    if (row.no==null) row.no = "";
    if (row.jobNo==null) row.jobNo = "";
    if (row.projectName==null) row.projectName = "";
    if (row.deliveryDate==null) row.deliveryDate = "";
    if (row.delivered!=="Yes") row.delivered = "No";
    if (row.description==null) row.description = "";
    if (row.itemQty==null) row.itemQty = "";
    if (row.scope==null) row.scope = "";
    if (row.etaCoating==null) row.etaCoating = "";
    if (row.etaFabFrame==null) row.etaFabFrame = "";
    if (row.etaFabShutter==null) row.etaFabShutter = "";
    return row;
  }

  // ---- header/column layout: every column is a plain fixed pixel width —
  // no resize handles, no sticky pinning (see the CSS comment above the
  // .wa-board rules in InstallPlanner.html for why sticky pinning was left
  // off the meta columns generally). ----
  var META_LABELS = [
    {cls:"wc-idx", txt:"", key:null},
    {cls:"wc-no", txt:"No.", key:"no"},
    {cls:"wc-jobno", txt:"Job #", key:"jobNo"},
    {cls:"wc-projectname", txt:"Project Name", key:"projectName"},
    {cls:"wc-deliverydate", txt:"Delivery Date", key:"deliveryDate"},
    {cls:"wc-delivered", txt:"Delivered", key:"delivered"},
    {cls:"wc-description", txt:"Description", key:"description"},
    {cls:"wc-itemqty", txt:"Item Qty", key:"itemQty"},
    {cls:"wc-scope", txt:"Scope", key:"scope"},
    {cls:"wc-etacoating", txt:"ETA Coating", key:"etaCoating"},
    {cls:"wc-etaframe", txt:"ETA Fabrication Frame", key:"etaFabFrame"},
    {cls:"wc-etashutter", txt:"ETA Fabrication Shutter", key:"etaFabShutter"}
  ];

  function gridTemplateColumns(){
    return "40px 56px 86px 190px 116px 88px 170px 76px 260px 190px 190px 190px";
  }

  function metaHeaderHTML(){
    return META_LABELS.map(function(l, i){
      return '<div class="cell meta-head '+l.cls+'" style="grid-column:'+(i+1)+' / span 1; grid-row:1;">'+escText(l.txt)+'</div>';
    }).join("");
  }

  // The "No." field (from the source spreadsheet's own numbering) is the
  // one column that identifies which project/job a row belongs to — several
  // rows commonly share the same No. when they're line-items on the same
  // job. There is deliberately no second, auto-incrementing row counter
  // alongside it (a project list would show both a position number and a
  // separate ID; here that would just be two different numbers competing
  // to answer the same "which item is this" question) — the idx column
  // holds only the delete button, always visible rather than reappearing
  // on hover, since there's no number underneath it to protect and this
  // board is meant to work as well from a factory tablet (no hover) as a
  // desktop.
  function rowHTML(row, rowIndex){
    var gridRow = 2 + rowIndex; // single header row
    var html = "";
    html += '<div class="cell wc-idx" style="grid-column:1; grid-row:'+gridRow+';">'+
      '<button class="del-btn" type="button" data-wa-action="delete" data-id="'+row.id+'" aria-label="Delete row" title="Delete row">✕</button></div>';

    html += '<div class="cell wc-no" style="grid-column:2; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="no" data-id="'+row.id+'" value="'+escAttr(row.no)+'" aria-label="No."></div>';

    html += '<div class="cell wc-jobno" style="grid-column:3; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="jobNo" data-id="'+row.id+'" value="'+escAttr(row.jobNo)+'" aria-label="Job number"></div>';

    html += '<div class="cell wc-projectname" style="grid-column:4; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="projectName" data-id="'+row.id+'" placeholder="Project name" aria-label="Project name">'+escText(row.projectName)+'</textarea></div>';

    html += '<div class="cell wc-deliverydate" style="grid-column:5; grid-row:'+gridRow+';">'+
      '<button type="button" class="date-btn'+(row.deliveryDate?"":" placeholder")+'" data-wa-date-btn="deliveryDate" data-id="'+row.id+'" aria-label="Delivery date">'+(fmtDateDisplay(row.deliveryDate)||"d/mm/yyyy")+'</button></div>';

    html += '<div class="cell wc-delivered" style="grid-column:6; grid-row:'+gridRow+';">'+
      '<select class="field" data-wa-field="delivered" data-id="'+row.id+'" aria-label="Delivered">'+
      '<option value="No"'+(row.delivered!=="Yes"?" selected":"")+'>No</option>'+
      '<option value="Yes"'+(row.delivered==="Yes"?" selected":"")+'>Yes</option>'+
      '</select></div>';

    html += '<div class="cell wc-description" style="grid-column:7; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="description" data-id="'+row.id+'" placeholder="Description" aria-label="Description">'+escText(row.description)+'</textarea></div>';

    html += '<div class="cell wc-itemqty" style="grid-column:8; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="itemQty" data-id="'+row.id+'" value="'+escAttr(row.itemQty)+'" aria-label="Item quantity"></div>';

    html += '<div class="cell wc-scope" style="grid-column:9; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="scope" data-id="'+row.id+'" placeholder="Scope" aria-label="Scope">'+escText(row.scope)+'</textarea></div>';

    html += '<div class="cell wc-etacoating" style="grid-column:10; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaCoating" data-id="'+row.id+'" placeholder="ETA coating" aria-label="ETA coating">'+escText(row.etaCoating)+'</textarea></div>';

    html += '<div class="cell wc-etaframe" style="grid-column:11; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaFabFrame" data-id="'+row.id+'" placeholder="ETA fabrication frame" aria-label="ETA fabrication frame">'+escText(row.etaFabFrame)+'</textarea></div>';

    html += '<div class="cell wc-etashutter" style="grid-column:12; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaFabShutter" data-id="'+row.id+'" placeholder="ETA fabrication shutter" aria-label="ETA fabrication shutter">'+escText(row.etaFabShutter)+'</textarea></div>';

    return html;
  }

  // ---- CSV / Excel import ----
  var HEADER_MAP = {
    no: ["no","number","#"],
    jobNo: ["job","jobno","jobnumber","job#"],
    projectName: ["projectname","project","name"],
    deliveryDate: ["deliverydaterequestedbyeurolux","deliverydate","requesteddeliverydate","delivery"],
    description: ["description","desc"],
    itemQty: ["itemqty","qty","quantity","itemquantity"],
    scope: ["scope"],
    etaCoating: ["etacoating","coating"],
    etaFabFrame: ["etafabricationframe","etaframe","fabricationframe","frame"],
    etaFabShutter: ["etafabricationshutter","etashutter","fabricationshutter","shutter"]
  };

  function mapRows(rows){
    if (!rows.length) return [];
    var headerRow = rows[0].map(normHeader);
    var colIndex = {};
    Object.keys(HEADER_MAP).forEach(function(key){
      var idx = -1;
      HEADER_MAP[key].some(function(alias){
        var i = headerRow.indexOf(alias);
        if (i>-1){ idx=i; return true; }
        return false;
      });
      colIndex[key] = idx;
    });
    var out = [];
    for (var r=1;r<rows.length;r++){
      var row = rows[r];
      if (!row || row.every(function(c){return c==="" || c==null;})) continue;
      var get = function(key){ return colIndex[key]>-1 ? row[colIndex[key]] : ""; };
      var projectName = String(get("projectName")||"").trim();
      var scope = String(get("scope")||"").trim();
      if (!projectName && !scope) continue;
      var rawDelivery = String(get("deliveryDate")||"").trim();
      var delivered = /delivered/i.test(rawDelivery) ? "Yes" : "No";
      var importDeliveryDate = delivered==="Yes" ? "" : parseDateFlexible(get("deliveryDate"));
      out.push(normalizeRow({
        id:"wa"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+r,
        no:String(get("no")||"").trim(),
        jobNo:String(get("jobNo")||"").trim(),
        projectName:projectName,
        deliveryDate:importDeliveryDate,
        delivered:delivered,
        description:String(get("description")||"").trim(),
        itemQty:String(get("itemQty")||"").trim(),
        scope:scope,
        etaCoating:String(get("etaCoating")||"").trim(),
        etaFabFrame:String(get("etaFabFrame")||"").trim(),
        etaFabShutter:String(get("etaFabShutter")||"").trim()
      }));
    }
    return out;
  }

  // ---- seed data: the real 38-row list from PROJECT UPDATE 11 09 26.xlsx,
  // used the first time either page ever loads with no shared doc yet. ----
  var SEED_ROWS = [
    { id:'wa1', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', deliveryDate:'2026-09-15', delivered:'No', description:'White Aluminum - Schuco', itemQty:'4', scope:'ASE 54 PD ME SLIDING DOOR', etaCoating:'RECEIVED', etaFabFrame:'FRAME WILL BE READY\n17-09-2026', etaFabShutter:'WILL UPDATE THE COMPLETION DATE\n(SUBJECT TO MATERIAL AVAILABILITY AND GLASS DELIVERY)' },
    { id:'wa2', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', deliveryDate:'2026-09-30', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS 65 BOTTOM HUNG WINDOW WITH FIXED PANEL ABOVE', etaCoating:'MATERIAL NOT SEND, WAITING FOR BALANCE MATERIAL TO RECEIVE', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa3', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', deliveryDate:'2026-09-30', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'AWS 65 SIDE HUNG WINDOW', etaCoating:'MATERIAL NOT SEND, WAITING FOR BALANCE MATERIAL TO RECEIVE', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa4', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'5', scope:'ASE 54 PD', etaCoating:'MATERIAL LIST NOT RECEIVED', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa5', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'7', scope:'ASE 54 PD', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME WILL BE READY\n05-10-2026', etaFabShutter:'WILL UPDATE THE COMPLETION DATE\n(SUBJECT TO MATERIAL AVAILABILITY AND GLASS DELIVERY)' },
    { id:'wa6', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'ADS 65 HD Signle Door ( 2 doors with SANDWICH PANEL SHEET )', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026' },
    { id:'wa7', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'AWS 65 Top hanged', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026' },
    { id:'wa8', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS Fix Glass', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026' },
    { id:'wa9', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curved Curtainwall Unit + Glass Fixed Flat Bars', etaCoating:'WILL RECEIVE FROM COATING\n15-09-2026', etaFabFrame:'TEMPLATE WILL BE READY ON 17-09-2026', etaFabShutter:'' },
    { id:'wa10', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curtainwall Unit (BOTTOM OF SLIDING ASE 54)', etaCoating:'', etaFabFrame:'WILL BE READY ON 12-09-2026', etaFabShutter:'' },
    { id:'wa11', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curtainwall Unit', etaCoating:'', etaFabFrame:'WILL BE READY ON 12-09-2026', etaFabShutter:'' },
    { id:'wa12', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'Main Entrace Door – Schuco ( without smart lock)', etaCoating:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026', etaFabFrame:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026', etaFabShutter:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026' },
    { id:'wa13', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'ASE 54 Sliding ( 3 track) + combined with EFP curtainwall unit+ Glass Fixed Flat Bars (Ref: Drawing)', etaCoating:'', etaFabFrame:'FRAMES READY', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 01 DAY FOR BONDING AFTER GLASS RECEIVE' },
    { id:'wa14', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'ASE 54 PD Sliding Window', etaCoating:'', etaFabFrame:'FRAMES READY', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 01 DAY FOR BONDING AFTER GLASS RECEIVE' },
    { id:'wa15', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'ASE 70 PD ME POCKET SLIDING DOOR', etaCoating:'15-09-2026', etaFabFrame:'23-09-2026', etaFabShutter:'WILL UPDATE  (SUBJECT TO GLASS RECEIVE)' },
    { id:'wa16', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'EFP Arched Fixed unit', etaCoating:'WILL BE RECEIVED FROM COATING 19-09-2026', etaFabFrame:'TEMPLATE WILL BE READY ON 20-09-2026', etaFabShutter:'' },
    { id:'wa17', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'3', scope:'EFP Rectangle Fixed Unit', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED' },
    { id:'wa18', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'4', scope:'EFP 65 HD Single Door (Open outside- R.Hs-1.No + LHs-3.Nos)', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED' },
    { id:'wa19', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'EFP TOP HUNG WINDOW', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED' },
    { id:'wa20', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'2026-09-14', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'9', scope:'ASE 36 PD Sliding Units', etaCoating:'', etaFabFrame:'FRAME DELIVERED', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 02 DAYS FOR BONDING AFTER GLASS RECEIVE' },
    { id:'wa21', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', deliveryDate:'2026-10-05', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'4', scope:'ASE 36 PD Sliding Units', etaCoating:'MATERIAL NOT SENT FOR COATING', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa22', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', deliveryDate:'2026-09-19', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'FWS-50 (CW FRAME)', etaCoating:'BRACKETS WILL BE RECEIVED\n19-09-2026', etaFabFrame:'', etaFabShutter:'CURTAIN WALL FRAME IS READY, WAITING FOR GAL. BRACKETS' },
    { id:'wa23', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', deliveryDate:'2026-09-14', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS 65 HD MAIN PIVOT DOOR (INSIDE CW FRAME)', etaCoating:'', etaFabFrame:'', etaFabShutter:'WILL BE READY,\n14-09-2026\nSUBJECT TO HPL PANEL RECEIVE' },
    { id:'wa24', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', deliveryDate:'2026-09-12', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS 65 HD SINGLE LEAF HINGES DOOR', etaCoating:'', etaFabFrame:'', etaFabShutter:'WILL BE READY,\n12-09-2026 - AFTERNOON' },
    { id:'wa25', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'AWS-65 (TOP HUNG & BOTTOM FIX)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa26', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS-65 (TOP HUNG WINDOW)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa27', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'5', scope:'ASE-55 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa28', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS-65 (HINGES DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa29', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ASE-54 (SLIDING WINDOW)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa30', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'FWS-50 (CW FRAME) +\nASE-80 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa31', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'FWS-50 (CW FRAME)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa32', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'FWS-50 (CURVE CW FRAME) +\nASE-80 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa33', no:'8', jobNo:'1384', projectName:'VILLA 15, THE MANSIONS,\nJUMEIRAH ISLANDS', deliveryDate:'2026-09-22', delivered:'No', description:'PIVOT DOOR', itemQty:'1', scope:'ADS 65 (PIVOT DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa34', no:'9', jobNo:'', projectName:'VILLA 15, THE MANSIONS,\nJUMEIRAH ISLANDS', deliveryDate:'2026-09-12', delivered:'No', description:'SKYLIGHT', itemQty:'', scope:'SKYLIGHT', etaCoating:'?', etaFabFrame:'?', etaFabShutter:'?' },
    { id:'wa35', no:'10', jobNo:'1385', projectName:'VILLA 164, GOLF PLACE,\nDUBAI HILLS', deliveryDate:'2026-09-15', delivered:'No', description:'HINGE DOOR', itemQty:'1', scope:'EFP SINGLE HINGED DOOR', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa36', no:'11', jobNo:'1388', projectName:'VILLA 190,\nFAIRWAYS,\nDUBAI HILLS', deliveryDate:'2026-09-21', delivered:'No', description:'PIVOT DOOR', itemQty:'1', scope:'ADS 65 (PIVOT DOOR) - HPL PANEL', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa37', no:'12', jobNo:'1392', projectName:'Marsa Al Arab', deliveryDate:'2026-09-24', delivered:'No', description:'ADS 65 (HINGES DOOR)', itemQty:'5', scope:'ADS 65 (DOUBLE LEAF DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' },
    { id:'wa38', no:'12', jobNo:'1392', projectName:'Marsa Al Arab', deliveryDate:'2026-09-24', delivered:'No', description:'ADS 65 (HINGES DOOR)', itemQty:'4', scope:'ADS 65 (SINGLE LEAF DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'' }
  ];

  window.WA = {
    SEED_ROWS: SEED_ROWS,
    newRow: newRow,
    normalizeRow: normalizeRow,
    META_LABELS: META_LABELS,
    gridTemplateColumns: gridTemplateColumns,
    metaHeaderHTML: metaHeaderHTML,
    rowHTML: rowHTML,
    HEADER_MAP: HEADER_MAP,
    mapRows: mapRows,
    escText: escText,
    escAttr: escAttr,
    fmtDateDisplay: fmtDateDisplay,
    parseDateFlexible: parseDateFlexible,
    normHeader: normHeader
  };
})();
