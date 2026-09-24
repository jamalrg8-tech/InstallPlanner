// Eurolux WA production tracker — shared data model + rendering, used by
// BOTH InstallPlanner.html (as the "WA Tracker" tab) and wa-tracker.html
// (the standalone, factory-facing page reached via a shared link). Keeping
// this logic in one file means both places always agree on what a row
// looks like, how it's rendered, how a spreadsheet import is parsed, how
// columns resize, and how the board exports to Excel/PDF — nothing here
// should assume which page it's running in.
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

  // Display format for date fields: day (no leading zero) / month (2
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

  // ---- Due-soon delivery warning: flags any row whose Eurolux Required
  // Delivery Date is within `thresholdDays` of today (default 7) and hasn't
  // been marked Delivered yet, so both host pages compute — and word — the
  // exact same warning off the same data. `todayIso` can be passed for
  // testing; it defaults to the real current date. Rows are returned most-
  // urgent first (overdue rows before rows still days away).
  function dueSoonLabel(row){
    var name = (row.projectName && row.projectName.trim()) ? row.projectName.trim() : "Untitled line-item";
    return row.jobNo ? name+" (Job "+row.jobNo+")" : name;
  }
  function dueSoonMessage(row, daysLeft){
    var dateStr = fmtDateDisplay(row.deliveryDate);
    if (daysLeft < 0){
      var overdueBy = -daysLeft;
      return "Eurolux required delivery date was due "+overdueBy+" day"+(overdueBy===1?"":"s")+" ago ("+dateStr+") — please ensure all materials are ready for collection as soon as possible.";
    }
    if (daysLeft === 0){
      return "Eurolux required delivery date is due today ("+dateStr+") — please ensure all materials are ready for collection today.";
    }
    return "Eurolux required delivery date will be due in "+daysLeft+" day"+(daysLeft===1?"":"s")+", please ensure all materials are ready for collection on "+dateStr+".";
  }
  function dueSoonRows(rows, thresholdDays, todayIso){
    thresholdDays = (thresholdDays==null) ? 7 : thresholdDays;
    var today = todayIso || (function(){ var t=new Date(); return iso(t.getFullYear(), t.getMonth()+1, t.getDate()); })();
    var todayMs = Date.UTC(+today.slice(0,4), +today.slice(5,7)-1, +today.slice(8,10));
    var out = [];
    (rows||[]).forEach(function(row){
      if (!row || !row.deliveryDate || row.delivered === "Yes") return;
      var dMs = Date.UTC(+row.deliveryDate.slice(0,4), +row.deliveryDate.slice(5,7)-1, +row.deliveryDate.slice(8,10));
      if (isNaN(dMs)) return;
      var daysLeft = Math.round((dMs - todayMs) / 86400000);
      if (daysLeft > thresholdDays) return;
      out.push({ row: row, daysLeft: daysLeft, label: dueSoonLabel(row), message: dueSoonMessage(row, daysLeft) });
    });
    out.sort(function(a,b){ return a.daysLeft - b.daysLeft; });
    return out;
  }
  // Builds the warning banner's inner HTML (icon, summary line, one row per
  // item, and a dismiss button) from an already-computed/filtered list (see
  // dueSoonRows() above) — kept here, not in each host page, so the wording
  // is guaranteed identical on both screens. Each host page owns the outer
  // container (position/sticky styling, its own "which ids did I already
  // dismiss this session" set) and just swaps this HTML in and out of it;
  // the close button carries data-wa-due-dismiss so a host's own delegated
  // click listener can hide the banner (see wireDueSoonBanner() below).
  function dueSoonBannerHTML(items){
    if (!items || !items.length) return "";
    var rows = items.map(function(it){
      return '<div class="wa-due-item" data-wa-due-id="'+escAttr(it.row.id)+'"><b>'+escText(it.label)+':</b> '+escText(it.message)+'</div>';
    }).join("");
    return '<div class="wa-due-banner-icon" aria-hidden="true">⚠️</div>'+
      '<div class="wa-due-banner-body">'+
        '<div class="wa-due-banner-title">'+items.length+' WA line-item'+(items.length===1?"":"s")+' due for delivery soon</div>'+
        rows+
      '</div>'+
      '<button type="button" class="wa-due-banner-close" data-wa-due-dismiss="1" aria-label="Dismiss this warning">×</button>';
  }
  // Wires one host page's banner container up to dueSoonRows()/dueSoonBannerHTML()
  // above. `getRows` returns the current array of WA rows (called fresh each
  // refresh(), so it always sees the latest data) and `el` is the banner's
  // outer container (an empty, hidden-by-default element in the host's own
  // markup). Dismissing hides the banner for the rest of this page load only
  // (dismissedIds lives in memory, not saved anywhere) — reloading the page,
  // or the item simply no longer qualifying (delivered, or no longer within
  // the threshold), is what actually clears it for good. Returns a
  // refresh() function the host calls after any edit/save/reload.
  function wireDueSoonBanner(el, getRows, opts){
    if (!el) return { refresh: function(){} };
    var thresholdDays = (opts && opts.thresholdDays!=null) ? opts.thresholdDays : 7;
    var dismissedIds = {};
    var lastShownIds = [];
    el.addEventListener("click", function(e){
      if (e.target.closest("[data-wa-due-dismiss]")){
        lastShownIds.forEach(function(id){ dismissedIds[id] = true; });
        el.hidden = true;
        el.innerHTML = "";
      }
    });
    function refresh(){
      var items = dueSoonRows(getRows(), thresholdDays).filter(function(it){ return !dismissedIds[it.row.id]; });
      lastShownIds = items.map(function(it){ return it.row.id; });
      if (!items.length){ el.hidden = true; el.innerHTML = ""; return; }
      el.hidden = false;
      el.innerHTML = dueSoonBannerHTML(items);
    }
    return { refresh: refresh };
  }

  function newRow(){
    return { id:"wa"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      no:"", jobNo:"", projectName:"", lpoRef:"", ralColour:"", deliveryDate:"",
      delivered:"No", description:"", itemQty:"", scope:"", etaCoating:"", etaFabFrame:"", etaFabShutter:"",
      remarks:"", editedAt:{} };
  }

  function normalizeRow(row){
    if (row.no==null) row.no = "";
    if (row.jobNo==null) row.jobNo = "";
    if (row.projectName==null) row.projectName = "";
    if (row.lpoRef==null) row.lpoRef = "";
    if (row.ralColour==null) row.ralColour = "";
    if (row.deliveryDate==null) row.deliveryDate = "";
    if (row.delivered!=="Yes") row.delivered = "No";
    if (row.description==null) row.description = "";
    if (row.itemQty==null) row.itemQty = "";
    if (row.scope==null) row.scope = "";
    if (row.etaCoating==null) row.etaCoating = "";
    if (row.etaFabFrame==null) row.etaFabFrame = "";
    if (row.etaFabShutter==null) row.etaFabShutter = "";
    if (row.remarks==null) row.remarks = "";
    if (!row.editedAt || typeof row.editedAt !== "object") row.editedAt = {};
    return row;
  }

  // ---- Field-updated notification: any edit to any WA field bolds +
  // highlights that one field for 24 hours and lists it in a banner at the
  // top of the screen, so a change (by anyone, on either host page) is hard
  // to miss. Timestamps live on the row itself (row.editedAt[fieldKey] =
  // epoch ms), saved/synced the same as every other field, so this survives
  // reloads and is shared across every device looking at the same tracker —
  // unlike the due-soon banner's dismissal, which is deliberately
  // per-session only, this is genuinely time-based: it only clears once 24
  // hours have actually passed since that edit, not just on request. ----
  var FIELD_EDIT_WINDOW_MS = 24*60*60*1000;

  function markFieldEdited(row, field, nowMs){
    if (!row) return;
    if (!row.editedAt || typeof row.editedAt !== "object") row.editedAt = {};
    row.editedAt[field] = nowMs || Date.now();
  }

  function fieldLabelFor(field){
    var found = null;
    META_LABELS.some(function(l){ if (l.key===field){ found=l.txt; return true; } return false; });
    return found || field;
  }

  function isFieldRecentlyEdited(row, field, windowMs, nowMs){
    windowMs = (windowMs==null) ? FIELD_EDIT_WINDOW_MS : windowMs;
    nowMs = (nowMs==null) ? Date.now() : nowMs;
    if (!row || !row.editedAt) return false;
    var ts = row.editedAt[field];
    if (!ts) return false;
    var age = nowMs - ts;
    return age>=0 && age<=windowMs;
  }

  function relativeAge(ms){
    var mins = Math.floor(ms/60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 minute ago";
    if (mins < 60) return mins+" minutes ago";
    var hrs = Math.floor(mins/60);
    if (hrs === 1) return "1 hour ago";
    return hrs+" hours ago";
  }

  function fieldEditMessage(row, field, ageMs){
    var label = fieldLabelFor(field);
    var raw = row[field];
    var valStr = (raw==null ? "" : String(raw)).trim();
    if (field === "deliveryDate") valStr = fmtDateDisplay(raw);
    var valuePart;
    if (!valStr) valuePart = "cleared";
    else if (valStr.length > 70) valuePart = 'changed to "'+valStr.slice(0,67)+'…"';
    else valuePart = 'changed to "'+valStr+'"';
    return label+" was "+valuePart+" — "+relativeAge(ageMs)+".";
  }

  // Returns every field edit still inside the window, most-recent first —
  // one entry per (row, field) pair, so a row with three fields changed
  // recently shows up as three separate lines (each field is its own fact
  // worth stating), across however many rows currently qualify.
  function recentFieldEdits(rows, windowMs, nowMs){
    windowMs = (windowMs==null) ? FIELD_EDIT_WINDOW_MS : windowMs;
    nowMs = (nowMs==null) ? Date.now() : nowMs;
    var out = [];
    (rows||[]).forEach(function(row){
      if (!row || !row.editedAt) return;
      Object.keys(row.editedAt).forEach(function(field){
        var ts = row.editedAt[field];
        if (!ts) return;
        var age = nowMs - ts;
        if (age < 0 || age > windowMs) return;
        out.push({ row:row, field:field, ts:ts, label:dueSoonLabel(row), message:fieldEditMessage(row, field, age) });
      });
    });
    out.sort(function(a,b){ return b.ts - a.ts; });
    return out;
  }

  // Same shape/markup pattern as dueSoonBannerHTML() above (icon, title,
  // one line per item, dismiss button) so the two banners look like a
  // matched pair when both are showing, just in a different color.
  function fieldEditBannerHTML(items){
    if (!items || !items.length) return "";
    var rows = items.map(function(it){
      return '<div class="wa-edit-item" data-wa-edit-id="'+escAttr(it.row.id)+'" data-wa-edit-field="'+escAttr(it.field)+'"><b>'+escText(it.label)+':</b> '+escText(it.message)+'</div>';
    }).join("");
    return '<div class="wa-edit-banner-icon" aria-hidden="true">✏️</div>'+
      '<div class="wa-edit-banner-body">'+
        '<div class="wa-edit-banner-title">'+items.length+' field'+(items.length===1?"":"s")+' updated in the last 24 hours</div>'+
        rows+
      '</div>'+
      '<button type="button" class="wa-edit-banner-close" data-wa-edit-dismiss="1" aria-label="Dismiss this notification">×</button>';
  }

  // Wires one host page's field-edit banner up to recentFieldEdits()/
  // fieldEditBannerHTML() above — mirrors wireDueSoonBanner()'s shape, but
  // dismissal is keyed by (row id + field + timestamp) rather than just row
  // id: since a genuinely new edit gets a new timestamp, dismissing a stale
  // notice never suppresses a fresh one on that same field later. Reappears
  // next time the tracker is opened (dismissedKeys lives only in memory)
  // for as long as that edit is still inside the 24-hour window; refresh()
  // is also what naturally drops an item once 24 hours actually pass.
  function wireFieldEditBanner(el, getRows, opts){
    if (!el) return { refresh: function(){} };
    var windowMs = (opts && opts.windowMs!=null) ? opts.windowMs : FIELD_EDIT_WINDOW_MS;
    var dismissedKeys = {};
    var lastShownKeys = [];
    el.addEventListener("click", function(e){
      if (e.target.closest("[data-wa-edit-dismiss]")){
        lastShownKeys.forEach(function(k){ dismissedKeys[k] = true; });
        el.hidden = true;
        el.innerHTML = "";
      }
    });
    function keyFor(it){ return it.row.id+"|"+it.field+"|"+it.ts; }
    function refresh(){
      var items = recentFieldEdits(getRows(), windowMs).filter(function(it){ return !dismissedKeys[keyFor(it)]; });
      lastShownKeys = items.map(keyFor);
      if (!items.length){ el.hidden = true; el.innerHTML = ""; return; }
      el.hidden = false;
      el.innerHTML = fieldEditBannerHTML(items);
    }
    return { refresh: refresh };
  }

  // The field-edit input handler patches a cell's highlight class directly
  // (no full render, so typing never loses focus — see the comment above
  // that handler in each host page), which means the class never gets
  // cleared on its own once 24 hours pass unless something re-renders that
  // row. This sweep — run from the same periodic timer that already
  // refreshes the banners — checks every currently-highlighted cell inside
  // `boardEl` against the live data and drops the class the moment its edit
  // ages out, without touching anything else on the board.
  function sweepFieldHighlights(boardEl, getRows){
    if (!boardEl) return;
    var rowsById = {};
    (getRows()||[]).forEach(function(r){ if (r && r.id) rowsById[r.id] = r; });
    var cells = boardEl.querySelectorAll(".wa-field-recent-edit");
    for (var i=0; i<cells.length; i++){
      var cell = cells[i];
      var fieldEl = cell.querySelector("[data-wa-field]") || cell.querySelector("[data-wa-date-btn]");
      if (!fieldEl){ cell.classList.remove("wa-field-recent-edit"); continue; }
      var row = rowsById[fieldEl.dataset.id];
      var field = fieldEl.dataset.waField || fieldEl.dataset.waDateBtn;
      if (!row || !isFieldRecentlyEdited(row, field)) cell.classList.remove("wa-field-recent-edit");
    }
  }

  // ---- header/column layout: every column is resizable (drag the handle
  // on its right edge) and its width lives in a CSS custom property
  // (--wa-w-<key>) so both host pages can resize independently per device —
  // see createBoardControls() below, which owns the drag interaction, the
  // per-device persisted widths/row-height, and keeping the always-visible
  // bottom scrollbar in sync. No sticky pinning (see the CSS comment above
  // the .wa-board rules in InstallPlanner.html for why sticky pinning is
  // left off the meta columns generally) — the whole row just scrolls
  // together as one unit, horizontally and vertically. ----
  var META_LABELS = [
    {cls:"wc-idx", txt:"", key:null},
    {cls:"wc-no", txt:"No.", key:"no"},
    {cls:"wc-jobno", txt:"Job #", key:"jobNo"},
    {cls:"wc-projectname", txt:"Project Name", key:"projectName"},
    {cls:"wc-lporef", txt:"LPO Ref.", key:"lpoRef"},
    {cls:"wc-ralcolour", txt:"RAL Colour", key:"ralColour"},
    {cls:"wc-deliverydate", txt:"Eurolux Required Delivery Date", key:"deliveryDate"},
    {cls:"wc-delivered", txt:"Delivered", key:"delivered"},
    {cls:"wc-description", txt:"Description", key:"description"},
    {cls:"wc-itemqty", txt:"Item Qty", key:"itemQty"},
    {cls:"wc-scope", txt:"Scope", key:"scope"},
    {cls:"wc-etacoating", txt:"ETA Coating", key:"etaCoating"},
    {cls:"wc-etaframe", txt:"ETA Fabrication Frame", key:"etaFabFrame"},
    {cls:"wc-etashutter", txt:"ETA Fabrication Shutter", key:"etaFabShutter"},
    {cls:"wc-remarks", txt:"Remarks", key:"remarks"}
  ];

  // Default/min/max widths, keyed by field key (the idx column is fixed at
  // 40px and isn't resizable — see metaHeaderHTML(), which skips a handle
  // for the one column with key:null).
  var DEFAULT_COL_W = { no:56, jobNo:86, projectName:190, lpoRef:100, ralColour:110, deliveryDate:150, delivered:88, description:170, itemQty:76, scope:220, etaCoating:170, etaFabFrame:170, etaFabShutter:170, remarks:200 };
  var COL_MIN_W = { no:40, jobNo:50, projectName:100, lpoRef:60, ralColour:60, deliveryDate:90, delivered:60, description:60, itemQty:50, scope:60, etaCoating:60, etaFabFrame:60, etaFabShutter:60, remarks:60 };
  var COL_MAX_W = { no:120, jobNo:160, projectName:420, lpoRef:220, ralColour:220, deliveryDate:260, delivered:140, description:420, itemQty:140, scope:420, etaCoating:420, etaFabFrame:420, etaFabShutter:420, remarks:420 };

  // Row-height presets — a floor only (rows still grow taller than this to
  // fit longer content via minmax(..., auto) in gridTemplateRows()), so
  // shrinking to "Compact" never hides or clips anything; it only lets
  // short rows sit closer together to fit more in view at once.
  var ROW_HEIGHT_PRESETS = { compact:44, comfortable:64, expanded:96 };
  var HEADER_ROW_H = 56; // tall enough for a long header label to wrap onto two lines

  function gridTemplateColumns(){
    return META_LABELS.map(function(l){
      var key = l.key || "idx";
      var lower = key.toLowerCase();
      var def = key==="idx" ? 40 : (DEFAULT_COL_W[key] || 120);
      return "var(--wa-w-"+lower+", "+def+"px)";
    }).join(" ");
  }

  function gridTemplateRows(rowCount){
    if (!rowCount) return HEADER_ROW_H+"px 64px";
    return HEADER_ROW_H+"px "+"repeat("+rowCount+", minmax(var(--wa-row-min-height, 64px), auto))";
  }

  function metaHeaderHTML(){
    return META_LABELS.map(function(l, i){
      var handle = l.key ? '<div class="wa-col-handle" data-wa-col="'+l.key+'" title="Drag to resize this column"></div>' : "";
      return '<div class="cell meta-head '+l.cls+'" style="grid-column:'+(i+1)+' / span 1; grid-row:1;">'+escText(l.txt)+handle+'</div>';
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
    // Delivered rows get a green tint across every cell so a fully-delivered
    // line-item is obvious at a glance while scanning the board — same class
    // on both host pages (InstallPlanner's WA Tracker tab and the standalone
    // factory link) since they share this exact render function, and each
    // page's own <style> block defines .row-delivered the same way (light
    // and dark mode both covered there).
    var deliveredCls = row.delivered === "Yes" ? " row-delivered" : "";
    // Bold + highlight whichever individual fields were edited in the last
    // 24 hours (see markFieldEdited()/isFieldRecentlyEdited() above) — a
    // per-field class, not a whole-row one like deliveredCls, since it's
    // meant to point at exactly what changed, not the row as a whole.
    function editCls(key){ return isFieldRecentlyEdited(row, key) ? " wa-field-recent-edit" : ""; }
    var html = "";
    html += '<div class="cell wc-idx'+deliveredCls+'" style="grid-column:1; grid-row:'+gridRow+';">'+
      '<button class="del-btn" type="button" data-wa-action="delete" data-id="'+row.id+'" aria-label="Delete row" title="Delete row">✕</button></div>';

    html += '<div class="cell wc-no'+deliveredCls+editCls("no")+'" style="grid-column:2; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="no" data-id="'+row.id+'" value="'+escAttr(row.no)+'" aria-label="No."></div>';

    html += '<div class="cell wc-jobno'+deliveredCls+editCls("jobNo")+'" style="grid-column:3; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="jobNo" data-id="'+row.id+'" value="'+escAttr(row.jobNo)+'" aria-label="Job number"></div>';

    html += '<div class="cell wc-projectname'+deliveredCls+editCls("projectName")+'" style="grid-column:4; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="projectName" data-id="'+row.id+'" placeholder="Project name" aria-label="Project name">'+escText(row.projectName)+'</textarea></div>';

    html += '<div class="cell wc-lporef'+deliveredCls+editCls("lpoRef")+'" style="grid-column:5; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="lpoRef" data-id="'+row.id+'" value="'+escAttr(row.lpoRef)+'" aria-label="LPO reference"></div>';

    html += '<div class="cell wc-ralcolour'+deliveredCls+editCls("ralColour")+'" style="grid-column:6; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="ralColour" data-id="'+row.id+'" value="'+escAttr(row.ralColour)+'" aria-label="RAL colour"></div>';

    html += '<div class="cell wc-deliverydate'+deliveredCls+editCls("deliveryDate")+'" style="grid-column:7; grid-row:'+gridRow+';">'+
      '<button type="button" class="date-btn'+(row.deliveryDate?"":" placeholder")+'" data-wa-date-btn="deliveryDate" data-id="'+row.id+'" aria-label="Eurolux required delivery date">'+(fmtDateDisplay(row.deliveryDate)||"d/mm/yyyy")+'</button></div>';

    html += '<div class="cell wc-delivered'+deliveredCls+editCls("delivered")+'" style="grid-column:8; grid-row:'+gridRow+';">'+
      '<select class="field" data-wa-field="delivered" data-id="'+row.id+'" aria-label="Delivered">'+
      '<option value="No"'+(row.delivered!=="Yes"?" selected":"")+'>No</option>'+
      '<option value="Yes"'+(row.delivered==="Yes"?" selected":"")+'>Yes</option>'+
      '</select></div>';

    html += '<div class="cell wc-description'+deliveredCls+editCls("description")+'" style="grid-column:9; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="description" data-id="'+row.id+'" placeholder="Description" aria-label="Description">'+escText(row.description)+'</textarea></div>';

    html += '<div class="cell wc-itemqty'+deliveredCls+editCls("itemQty")+'" style="grid-column:10; grid-row:'+gridRow+';">'+
      '<input class="field" data-wa-field="itemQty" data-id="'+row.id+'" value="'+escAttr(row.itemQty)+'" aria-label="Item quantity"></div>';

    html += '<div class="cell wc-scope'+deliveredCls+editCls("scope")+'" style="grid-column:11; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="scope" data-id="'+row.id+'" placeholder="Scope" aria-label="Scope">'+escText(row.scope)+'</textarea></div>';

    html += '<div class="cell wc-etacoating'+deliveredCls+editCls("etaCoating")+'" style="grid-column:12; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaCoating" data-id="'+row.id+'" placeholder="ETA coating" aria-label="ETA coating">'+escText(row.etaCoating)+'</textarea></div>';

    html += '<div class="cell wc-etaframe'+deliveredCls+editCls("etaFabFrame")+'" style="grid-column:13; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaFabFrame" data-id="'+row.id+'" placeholder="ETA fabrication frame" aria-label="ETA fabrication frame">'+escText(row.etaFabFrame)+'</textarea></div>';

    html += '<div class="cell wc-etashutter'+deliveredCls+editCls("etaFabShutter")+'" style="grid-column:14; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="etaFabShutter" data-id="'+row.id+'" placeholder="ETA fabrication shutter" aria-label="ETA fabrication shutter">'+escText(row.etaFabShutter)+'</textarea></div>';

    html += '<div class="cell wc-remarks'+deliveredCls+editCls("remarks")+'" style="grid-column:15; grid-row:'+gridRow+';">'+
      '<textarea class="field autosize-field" data-wa-field="remarks" data-id="'+row.id+'" placeholder="Remarks" aria-label="Remarks">'+escText(row.remarks)+'</textarea></div>';

    return html;
  }

  // ---- CSV / Excel import ----
  var HEADER_MAP = {
    no: ["no","number","#"],
    jobNo: ["job","jobno","jobnumber","job#"],
    projectName: ["projectname","project","name"],
    lpoRef: ["lporef","lpo","lponumber","lpono","lporeference"],
    ralColour: ["ralcolour","ralcolor","ral","colour","color"],
    deliveryDate: ["euroluxrequireddeliverydate","deliverydaterequestedbyeurolux","deliverydate","requesteddeliverydate","delivery"],
    description: ["description","desc"],
    itemQty: ["itemqty","qty","quantity","itemquantity"],
    scope: ["scope"],
    etaCoating: ["etacoating","coating"],
    etaFabFrame: ["etafabricationframe","etaframe","fabricationframe","frame"],
    etaFabShutter: ["etafabricationshutter","etashutter","fabricationshutter","shutter"],
    remarks: ["remarks","remark","notes","note"]
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
        lpoRef:String(get("lpoRef")||"").trim(),
        ralColour:String(get("ralColour")||"").trim(),
        deliveryDate:importDeliveryDate,
        delivered:delivered,
        description:String(get("description")||"").trim(),
        itemQty:String(get("itemQty")||"").trim(),
        scope:scope,
        etaCoating:String(get("etaCoating")||"").trim(),
        etaFabFrame:String(get("etaFabFrame")||"").trim(),
        etaFabShutter:String(get("etaFabShutter")||"").trim(),
        remarks:String(get("remarks")||"").trim()
      }));
    }
    return out;
  }

  // ---- Excel / PDF export — both host pages already load the SheetJS
  // (XLSX) and jsPDF + jspdf-autotable libraries as globals, so this just
  // builds the shared column layout once rather than duplicating it. ----
  function sheetData(rows){
    var cols = META_LABELS.filter(function(l){ return l.key; });
    var dateKeys = { deliveryDate:1 };
    var headers = cols.map(function(l){ return l.txt; });
    var data = rows.map(function(row){
      return cols.map(function(l){
        var v = row[l.key];
        if (dateKeys[l.key]) return fmtDateDisplay(v);
        return v==null ? "" : v;
      });
    });
    return { headers:headers, data:data };
  }

  function exportXLSX(rows, filename){
    if (typeof XLSX === "undefined") return false;
    try{
      var sheet = sheetData(rows);
      var aoa = [sheet.headers].concat(sheet.data);
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = sheet.headers.map(function(h){ return { wch: Math.max(10, Math.min(42, h.length+4)) }; });
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "WA Tracker");
      XLSX.writeFile(wb, filename || "WA-Production-Tracker.xlsx");
      return true;
    } catch(e){ return false; }
  }

  function exportPDF(rows, filename){
    if (!window.jspdf || !window.jspdf.jsPDF) return false;
    try{
      var doc = new window.jspdf.jsPDF({ orientation:"landscape", unit:"pt", format:"a3" });
      doc.setFont("helvetica","bold"); doc.setFontSize(15);
      doc.setTextColor(46,92,138);
      doc.text("Eurolux WA Production Tracker", 40, 42);
      doc.setTextColor(40,40,40);
      doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
      doc.text("Generated "+new Date().toLocaleString(), 40, 58);
      var sheet = sheetData(rows);
      doc.autoTable({
        startY: 72,
        head: [sheet.headers],
        body: sheet.data,
        styles:{ fontSize:6.5, cellPadding:3, overflow:"linebreak" },
        headStyles:{ fillColor:[46,92,138], textColor:255, fontSize:7 }
      });
      doc.save(filename || "WA-Production-Tracker.pdf");
      return true;
    } catch(e){ return false; }
  }

  // ---- column widths + row height: per-device preferences (not synced —
  // each device/browser remembers its own layout, same as the main
  // schedule's own column widths), plus the drag interaction for the
  // resize handles rendered in metaHeaderHTML(), plus the always-visible
  // "shadow" horizontal scrollbar pinned under the board (see the .wa-hbar
  // markup/CSS in each host page) so you never have to scroll all the way
  // down through the rows to reach a horizontal scrollbar. One
  // implementation shared by both host pages so they can never drift. ----
  function createBoardControls(opts){
    var storageKey = opts.storageKey;
    var colWidths = Object.assign({}, DEFAULT_COL_W);
    var rowHeight = "comfortable";

    function load(){
      try{
        var raw = localStorage.getItem(storageKey);
        if (raw){
          var data = JSON.parse(raw);
          if (data && data.colWidths) colWidths = Object.assign({}, DEFAULT_COL_W, data.colWidths);
          if (data && ROW_HEIGHT_PRESETS[data.rowHeight]) rowHeight = data.rowHeight;
        }
      } catch(e){ /* corrupt or inaccessible storage — fall back to defaults */ }
    }
    function save(){
      try{ localStorage.setItem(storageKey, JSON.stringify({ colWidths:colWidths, rowHeight:rowHeight })); } catch(e){}
    }
    function applyVars(){
      var root = document.documentElement.style;
      Object.keys(colWidths).forEach(function(key){
        root.setProperty("--wa-w-"+key.toLowerCase(), colWidths[key]+"px");
      });
      root.setProperty("--wa-row-min-height", ROW_HEIGHT_PRESETS[rowHeight]+"px");
    }
    function resetToDefaults(){
      colWidths = Object.assign({}, DEFAULT_COL_W);
      rowHeight = "comfortable";
      applyVars();
      save();
      refreshScrollbar();
    }
    function setRowHeight(v){
      if (!ROW_HEIGHT_PRESETS[v]) return;
      rowHeight = v;
      applyVars();
      save();
    }
    function getRowHeight(){ return rowHeight; }

    function refreshScrollbar(){
      if (!opts.boardEl || !opts.hbarInnerEl || !opts.hscrollEl) return;
      requestAnimationFrame(function(){
        var w = opts.boardEl.scrollWidth;
        opts.hbarInnerEl.style.width = w + "px";
        if (opts.hbarEl && opts.hbarEl.scrollLeft !== opts.hscrollEl.scrollLeft){
          opts.hbarEl.scrollLeft = opts.hscrollEl.scrollLeft;
        }
      });
    }

    function attachResizeHandlers(){
      document.addEventListener("pointerdown", function(e){
        var handle = e.target.closest(".wa-col-handle");
        if (!handle) return;
        // Only react to handles that belong to THIS board's header (a page
        // has at most one WA board, but this keeps each controls instance
        // scoped defensively rather than assuming it's the only one).
        if (opts.boardEl && !opts.boardEl.contains(handle)) return;
        e.preventDefault();
        var key = handle.dataset.waCol;
        var startX = e.clientX;
        var startWidth = colWidths[key] || DEFAULT_COL_W[key] || 120;
        var min = COL_MIN_W[key] || 50, max = COL_MAX_W[key] || 500;
        handle.classList.add("dragging");
        function onMove(ev){
          var dx = ev.clientX - startX;
          colWidths[key] = Math.max(min, Math.min(max, Math.round(startWidth + dx)));
          applyVars();
          refreshScrollbar();
        }
        function onUp(){
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          handle.classList.remove("dragging");
          save();
        }
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      });
    }

    function attachScrollbarSync(){
      if (!opts.hscrollEl || !opts.hbarEl) return;
      var syncing = false;
      opts.hscrollEl.addEventListener("scroll", function(){
        if (syncing) return;
        syncing = true;
        opts.hbarEl.scrollLeft = opts.hscrollEl.scrollLeft;
        syncing = false;
      });
      opts.hbarEl.addEventListener("scroll", function(){
        if (syncing) return;
        syncing = true;
        opts.hscrollEl.scrollLeft = opts.hbarEl.scrollLeft;
        syncing = false;
      });
      // The board's own native horizontal scrollbar is hidden in favor of
      // the always-reachable one pinned below it (opts.hbarEl) — but a
      // trackpad/shift-wheel horizontal swipe made directly over the table
      // should still work rather than only responding to vertical scroll.
      opts.hscrollEl.addEventListener("wheel", function(e){
        if (e.deltaX !== 0 && Math.abs(e.deltaX) >= Math.abs(e.deltaY)){
          opts.hscrollEl.scrollLeft += e.deltaX;
          e.preventDefault();
        }
      }, { passive:false });
      window.addEventListener("resize", refreshScrollbar);
    }

    function init(){
      load();
      applyVars();
      attachResizeHandlers();
      attachScrollbarSync();
      refreshScrollbar();
    }

    return {
      init: init,
      applyVars: applyVars,
      resetToDefaults: resetToDefaults,
      setRowHeight: setRowHeight,
      getRowHeight: getRowHeight,
      refreshScrollbar: refreshScrollbar
    };
  }

  // A lighter-weight version of the always-visible "shadow" horizontal
  // scrollbar above, for boards that don't need resizable columns or
  // row-height presets — e.g. the main Schedule tab's plain project list.
  // Same sync/refresh behavior as createBoardControls(), just without the
  // column-width/localStorage machinery that board doesn't use (it already
  // has its own, separate column-resize + prefs system).
  function createHScrollbar(opts){
    function refresh(){
      if (!opts.boardEl || !opts.hbarInnerEl || !opts.hscrollEl) return;
      requestAnimationFrame(function(){
        var w = opts.boardEl.scrollWidth;
        opts.hbarInnerEl.style.width = w + "px";
        if (opts.hbarEl && opts.hbarEl.scrollLeft !== opts.hscrollEl.scrollLeft){
          opts.hbarEl.scrollLeft = opts.hscrollEl.scrollLeft;
        }
      });
    }
    function attachSync(){
      if (!opts.hscrollEl || !opts.hbarEl) return;
      var syncing = false;
      opts.hscrollEl.addEventListener("scroll", function(){
        if (syncing) return;
        syncing = true;
        opts.hbarEl.scrollLeft = opts.hscrollEl.scrollLeft;
        syncing = false;
      });
      opts.hbarEl.addEventListener("scroll", function(){
        if (syncing) return;
        syncing = true;
        opts.hscrollEl.scrollLeft = opts.hbarEl.scrollLeft;
        syncing = false;
      });
      opts.hscrollEl.addEventListener("wheel", function(e){
        if (e.deltaX !== 0 && Math.abs(e.deltaX) >= Math.abs(e.deltaY)){
          opts.hscrollEl.scrollLeft += e.deltaX;
          e.preventDefault();
        }
      }, { passive:false });
      window.addEventListener("resize", refresh);
    }
    function init(){
      attachSync();
      refresh();
    }
    return { init: init, refresh: refresh };
  }

  // ---- seed data: the real 38-row list from PROJECT UPDATE 11 09 26.xlsx,
  // used the first time either page ever loads with no shared doc yet. ----
var SEED_ROWS = [
    { id:'wa1', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', lpoRef:'', ralColour:'', deliveryDate:'2026-09-15', delivered:'No', description:'White Aluminum - Schuco', itemQty:'4', scope:'ASE 54 PD ME SLIDING DOOR', etaCoating:'RECEIVED', etaFabFrame:'FRAME WILL BE READY\n17-09-2026', etaFabShutter:'WILL UPDATE THE COMPLETION DATE\n(SUBJECT TO MATERIAL AVAILABILITY AND GLASS DELIVERY)', remarks:'' },
    { id:'wa2', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', lpoRef:'', ralColour:'', deliveryDate:'2026-09-30', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS 65 BOTTOM HUNG WINDOW WITH FIXED PANEL ABOVE', etaCoating:'MATERIAL NOT SEND, WAITING FOR BALANCE MATERIAL TO RECEIVE', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa3', no:'1', jobNo:'1348', projectName:'RASHA 85, ARABIAN RANCHES 2', lpoRef:'', ralColour:'', deliveryDate:'2026-09-30', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'AWS 65 SIDE HUNG WINDOW', etaCoating:'MATERIAL NOT SEND, WAITING FOR BALANCE MATERIAL TO RECEIVE', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa4', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'5', scope:'ASE 54 PD', etaCoating:'MATERIAL LIST NOT RECEIVED', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa5', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'7', scope:'ASE 54 PD', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME WILL BE READY\n05-10-2026', etaFabShutter:'WILL UPDATE THE COMPLETION DATE\n(SUBJECT TO MATERIAL AVAILABILITY AND GLASS DELIVERY)', remarks:'' },
    { id:'wa6', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'ADS 65 HD Signle Door ( 2 doors with SANDWICH PANEL SHEET )', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', remarks:'' },
    { id:'wa7', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'AWS 65 Top hanged', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', remarks:'' },
    { id:'wa8', no:'2', jobNo:'1350', projectName:'MEADOWS 9 , Villa 15', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS Fix Glass', etaCoating:'WILL RECEIVE FROM COATING\n21-09-2026', etaFabFrame:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', etaFabShutter:'FRAME AND SHUTTER WILL BE READY\n01-10-2026', remarks:'' },
    { id:'wa9', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curved Curtainwall Unit + Glass Fixed Flat Bars', etaCoating:'WILL RECEIVE FROM COATING\n15-09-2026', etaFabFrame:'TEMPLATE WILL BE READY ON 17-09-2026', etaFabShutter:'', remarks:'' },
    { id:'wa10', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curtainwall Unit (BOTTOM OF SLIDING ASE 54)', etaCoating:'', etaFabFrame:'WILL BE READY ON 12-09-2026', etaFabShutter:'', remarks:'' },
    { id:'wa11', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'EFP - Curtainwall Unit', etaCoating:'', etaFabFrame:'WILL BE READY ON 12-09-2026', etaFabShutter:'', remarks:'' },
    { id:'wa12', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'Main Entrace Door – Schuco ( without smart lock)', etaCoating:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026', etaFabFrame:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026', etaFabShutter:'INTERNAL AND EXTERNAL HAVE DIFFERENT COLOUR, WILL UPDATE ON 14-09-2026', remarks:'' },
    { id:'wa13', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'ASE 54 Sliding ( 3 track) + combined with EFP curtainwall unit+ Glass Fixed Flat Bars (Ref: Drawing)', etaCoating:'', etaFabFrame:'FRAMES READY', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 01 DAY FOR BONDING AFTER GLASS RECEIVE', remarks:'' },
    { id:'wa14', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'1', scope:'ASE 54 PD Sliding Window', etaCoating:'', etaFabFrame:'FRAMES READY', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 01 DAY FOR BONDING AFTER GLASS RECEIVE', remarks:'' },
    { id:'wa15', no:'3', jobNo:'1361', projectName:'C35, Jumeirah Park', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'ASE 70 PD ME POCKET SLIDING DOOR', etaCoating:'15-09-2026', etaFabFrame:'23-09-2026', etaFabShutter:'WILL UPDATE  (SUBJECT TO GLASS RECEIVE)', remarks:'' },
    { id:'wa16', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'EFP Arched Fixed unit', etaCoating:'WILL BE RECEIVED FROM COATING 19-09-2026', etaFabFrame:'TEMPLATE WILL BE READY ON 20-09-2026', etaFabShutter:'', remarks:'' },
    { id:'wa17', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'3', scope:'EFP Rectangle Fixed Unit', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED', remarks:'' },
    { id:'wa18', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'4', scope:'EFP 65 HD Single Door (Open outside- R.Hs-1.No + LHs-3.Nos)', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED', remarks:'' },
    { id:'wa19', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'', delivered:'Yes', description:'White Aluminum - Schuco & EFP', itemQty:'2', scope:'EFP TOP HUNG WINDOW', etaCoating:'', etaFabFrame:'', etaFabShutter:'DELIVERED', remarks:'' },
    { id:'wa20', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'2026-09-14', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'9', scope:'ASE 36 PD Sliding Units', etaCoating:'', etaFabFrame:'FRAME DELIVERED', etaFabShutter:'SHUTTER WILL BE READY\n12-09-2026\nREQUIRE 02 DAYS FOR BONDING AFTER GLASS RECEIVE', remarks:'' },
    { id:'wa21', no:'4', jobNo:'1369', projectName:'VILLA 80, STREET 3,  ESMERALDA , VICTORY HEIGHT', lpoRef:'', ralColour:'', deliveryDate:'2026-10-05', delivered:'No', description:'White Aluminum - Schuco & EFP', itemQty:'4', scope:'ASE 36 PD Sliding Units', etaCoating:'MATERIAL NOT SENT FOR COATING', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa22', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', lpoRef:'', ralColour:'', deliveryDate:'2026-09-19', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'FWS-50 (CW FRAME)', etaCoating:'BRACKETS WILL BE RECEIVED\n19-09-2026', etaFabFrame:'', etaFabShutter:'CURTAIN WALL FRAME IS READY, WAITING FOR GAL. BRACKETS', remarks:'' },
    { id:'wa23', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', lpoRef:'', ralColour:'', deliveryDate:'2026-09-14', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS 65 HD MAIN PIVOT DOOR (INSIDE CW FRAME)', etaCoating:'', etaFabFrame:'', etaFabShutter:'WILL BE READY,\n14-09-2026\nSUBJECT TO HPL PANEL RECEIVE', remarks:'' },
    { id:'wa24', no:'5', jobNo:'1372', projectName:'Wildflower Villa K80', lpoRef:'', ralColour:'', deliveryDate:'2026-09-12', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS 65 HD SINGLE LEAF HINGES DOOR', etaCoating:'', etaFabFrame:'', etaFabShutter:'WILL BE READY,\n12-09-2026 - AFTERNOON', remarks:'' },
    { id:'wa25', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'AWS-65 (TOP HUNG & BOTTOM FIX)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa26', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'AWS-65 (TOP HUNG WINDOW)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa27', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'5', scope:'ASE-55 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa28', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ADS-65 (HINGES DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa29', no:'6', jobNo:'1380', projectName:'APARTMENT 606, DUBAI MARINA', lpoRef:'', ralColour:'', deliveryDate:'2026-09-23', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'ASE-54 (SLIDING WINDOW)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa30', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', lpoRef:'', ralColour:'', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'6', scope:'FWS-50 (CW FRAME) +\nASE-80 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa31', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', lpoRef:'', ralColour:'', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'3', scope:'FWS-50 (CW FRAME)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa32', no:'7', jobNo:'1383', projectName:'APARTMENT 603, KEMPINSKI RESIDENCES, PALM JUMAIRAH', lpoRef:'', ralColour:'', deliveryDate:'2026-09-25', delivered:'No', description:'White Aluminum - Schuco', itemQty:'1', scope:'FWS-50 (CURVE CW FRAME) +\nASE-80 (LIFT & SLIDE)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa33', no:'8', jobNo:'1384', projectName:'VILLA 15, THE MANSIONS,\nJUMEIRAH ISLANDS', lpoRef:'', ralColour:'', deliveryDate:'2026-09-22', delivered:'No', description:'PIVOT DOOR', itemQty:'1', scope:'ADS 65 (PIVOT DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa34', no:'9', jobNo:'', projectName:'VILLA 15, THE MANSIONS,\nJUMEIRAH ISLANDS', lpoRef:'', ralColour:'', deliveryDate:'2026-09-12', delivered:'No', description:'SKYLIGHT', itemQty:'', scope:'SKYLIGHT', etaCoating:'?', etaFabFrame:'?', etaFabShutter:'?', remarks:'' },
    { id:'wa35', no:'10', jobNo:'1385', projectName:'VILLA 164, GOLF PLACE,\nDUBAI HILLS', lpoRef:'', ralColour:'', deliveryDate:'2026-09-15', delivered:'No', description:'HINGE DOOR', itemQty:'1', scope:'EFP SINGLE HINGED DOOR', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa36', no:'11', jobNo:'1388', projectName:'VILLA 190,\nFAIRWAYS,\nDUBAI HILLS', lpoRef:'', ralColour:'', deliveryDate:'2026-09-21', delivered:'No', description:'PIVOT DOOR', itemQty:'1', scope:'ADS 65 (PIVOT DOOR) - HPL PANEL', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa37', no:'12', jobNo:'1392', projectName:'Marsa Al Arab', lpoRef:'', ralColour:'', deliveryDate:'2026-09-24', delivered:'No', description:'ADS 65 (HINGES DOOR)', itemQty:'5', scope:'ADS 65 (DOUBLE LEAF DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' },
    { id:'wa38', no:'12', jobNo:'1392', projectName:'Marsa Al Arab', lpoRef:'', ralColour:'', deliveryDate:'2026-09-24', delivered:'No', description:'ADS 65 (HINGES DOOR)', itemQty:'4', scope:'ADS 65 (SINGLE LEAF DOOR)', etaCoating:'', etaFabFrame:'', etaFabShutter:'', remarks:'' }
  ];

  window.WA = {
    SEED_ROWS: SEED_ROWS,
    newRow: newRow,
    normalizeRow: normalizeRow,
    META_LABELS: META_LABELS,
    DEFAULT_COL_W: DEFAULT_COL_W,
    COL_MIN_W: COL_MIN_W,
    COL_MAX_W: COL_MAX_W,
    ROW_HEIGHT_PRESETS: ROW_HEIGHT_PRESETS,
    gridTemplateColumns: gridTemplateColumns,
    gridTemplateRows: gridTemplateRows,
    metaHeaderHTML: metaHeaderHTML,
    rowHTML: rowHTML,
    HEADER_MAP: HEADER_MAP,
    mapRows: mapRows,
    exportXLSX: exportXLSX,
    exportPDF: exportPDF,
    createBoardControls: createBoardControls,
    createHScrollbar: createHScrollbar,
    dueSoonRows: dueSoonRows,
    dueSoonBannerHTML: dueSoonBannerHTML,
    wireDueSoonBanner: wireDueSoonBanner,
    FIELD_EDIT_WINDOW_MS: FIELD_EDIT_WINDOW_MS,
    markFieldEdited: markFieldEdited,
    isFieldRecentlyEdited: isFieldRecentlyEdited,
    recentFieldEdits: recentFieldEdits,
    fieldEditBannerHTML: fieldEditBannerHTML,
    wireFieldEditBanner: wireFieldEditBanner,
    sweepFieldHighlights: sweepFieldHighlights,
    escText: escText,
    escAttr: escAttr,
    fmtDateDisplay: fmtDateDisplay,
    parseDateFlexible: parseDateFlexible,
    normHeader: normHeader
  };
})();
