Number.prototype.formatMoney = function(c, d, t){
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };
 
 var genericData = [];
 var youData = [];

$(function() {
  $("#getExpediaHash").click(getExpediaHashParam);
//  $("#getSearchTerm").click(searchExpediaGeneric);
//  $("#compare").click(compareTables);
  
  $(".dateTime").datetimepicker({
    minView: 2,
    format: 'MM/DD/YYYY',
    disabledTimeIntervals: true
  });
    
});

function doSearch() {
  searchExpedia();
}


function getExpediaHashParam() {
  // step 1: get the hash
  $.ajax({
  url:'http://www.expedia.com/vspersonal/Hotel-Search',
//    url:$( "#expediaForm" ).attr('action'),
    method:'GET',
    data: {
      destination: $('#expediaForm input[name="destination"]').val(),
      startDate:   $('#expediaForm input[name="startDate"]').val(),
      endDate:     $('#expediaForm input[name="endDate"]').val(),
      adults:      $('#expediaForm input[name="adults"]').val()
    },
    xhrFields: { withCredentials: true }
  }).success(function(data, textStatus, jqXHR ) {
    searchExpedia(data);
  });
  
}

function searchExpedia(hParam) {
  $.ajax({
    url:'http://www.expedia.com/vspersonal/Hotel-Search?inpAjax=true&responsive=true',
    method:'POST',
    dataType:'json',
    data: {
      destination: $('#expediaForm input[name="destination"]').val(),
      startDate:   $('#expediaForm input[name="startDate"]').val(),
      endDate:     $('#expediaForm input[name="endDate"]').val(),
      adults:      $('#expediaForm input[name="adults"]').val(),
      hashParam:   hParam
    },
    xhrFields: { withCredentials: true }
  }).success(function(data) {
    youData = data;
    buildTable(data, "#you");
    searchExpediaGeneric(); // chain
  });

}

function searchExpediaGeneric() {
  $.ajax({
    url:'http://www.expedia.com/vspersonal/Hotel-Search?inpAjax=true&responsive=true',
    method:'POST',
    dataType:'json',
    data: {
      destination: $('#expediaForm input[name="destination"]').val(),
      startDate:   $('#expediaForm input[name="startDate"]').val(),
      endDate:     $('#expediaForm input[name="endDate"]').val(),
      adults:      $('#expediaForm input[name="adults"]').val(),
      hashParam:   "f47b011acfc5249e9966c1acd0c52c9d163daae5",
    }
  }).success(function(data) {
    genericData = data;
    buildTable(data, "#generic");
    compareTables(); // chain
  });
}

function buildTable(data, q) {
  $(q).html("");
  for (var idx in data) {
    var i = parseInt(idx)+1;
    $(q).append('<tr><td class="pidx_'+idx+'">#'+i+'</td><td class="ppr_'+idx+'">$'+data[idx][0].formatMoney(2,'.',',')+'</td><td class="pnm_'+idx+'">'+data[idx][1]+"</td></tr>");    
  }
}

/**
 * Name to idx, price
 * @param data
 */
function detailTable(data) {
  var ret = {};
  
  for (var idx in data) {
    ret[data[idx][1]] = [idx,data[idx][0]];
  }
  
  return ret;
}

function compareTables() {
  var y = detailTable(youData);
  var g = detailTable(genericData);
  
  for (var idx in youData) {
    try {
      if ((youData[idx][1] != genericData[idx][1])) {
        $('.pidx_'+idx).css("color","red");
      }      
    } catch (ex) {} 
    
    if (youData[idx][1] in g) { // is the hotel name in g
      if (youData[idx][0] != g[youData[idx][1]][1]) { // do the prices match
        $('#you').find('.ppr_'+idx).css("color","red");        
      }
    } else {
      $('#you').find('.pnm_'+idx).css("color","red");      
    }
  } 
  
  for (var idx in genericData) {
    if (genericData[idx][1] in y) { // is the hotel name in y
      if (genericData[idx][0] != y[genericData[idx][1]][1]) { // do the prices match
        $('#generic').find('.ppr_'+idx).css("color","red");        
      }
    } else {
      $('#generic').find('.pnm_'+idx).css("color","red");      
    }
  } 
  
}

