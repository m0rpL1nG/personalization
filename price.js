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
 
 $(window).resize(setGraphSize);
 
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
//  alert($('#expediaForm input[name="destination"]').val());
//  return;
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
//function searchExpedia() {
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
	buildGraph();
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

var hl = [];
var graphType = "diff";
function buildGraph()
{
	var hotels = {};

	for(var idx in youData)
	{
		var price = youData[idx][0];
		var name = youData[idx][1];
		hotels[name] = [price, 0, parseInt(idx), -1];
	}
	
	for(var idx in genericData)
	{
		var price = genericData[idx][0];
		var name = genericData[idx][1];
		if(name in hotels)
		{
			hotels[name][1] = price;
			hotels[name][3] = parseInt(idx);
		}
		else
		{
			hotels[name] = [0, price, -1, parseInt(idx)];
		}
	}
	
	var hotelsList = [];
	for(hotel in hotels)
	{
		hotelsList.push([hotel, hotels[hotel][0], hotels[hotel][1], hotels[hotel][2], hotels[hotel][3]]);
	}
	hotelsList = hotelsList.sort(hotelComp);
	hl = hotelsList;
	
	if(graphType == "diff")
	{
		graphByDiff(hotelsList);
	}
	else if(graphType == "rank")
	{
		graphByRank(youData, genericData);
	}
}

function hotelComp(a, b)
{
	var diff = Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]);
	if(diff != 0)
	{
		return diff;
	}
	else
	{
		return b[1] - a[1];
	}
}

var barChart;
var globalHotelNames = {};
function graphByDiff(hotels)
{
	Chart.defaults.global.maintainAspectRatio = false;
	Chart.defaults.global.tooltips.callbacks.title = labelModifier;
	//Chart.defaults.global.responsive = true;
	var nameList = [];
	var abbrList = [];
	var youList = [];
	var genericList = [];
	
	globalHotelNames = {};
	
	for(var i = 0; i < hotels.length; i++)
	{
		var origName = hotels[i][0];
		var words = origName.split(" ");
		var abbr = "";
		for(var x = 0; x < words.length; x++)
		{
			var word = words[x].toUpperCase();
			if(word[0] >= 'A' && word[0] <= 'Z')
			{
				abbr += word[0];
			}
		}
		
		abbr = (i+1) + ": " + abbr;
		globalHotelNames[abbr] = origName;
		
		nameList.push(origName);
		abbrList.push(abbr);
		youList.push(hotels[i][1]);
		genericList.push(hotels[i][2]);
	}
	
	setGraphSize();
	
	var barData = {
		labels : abbrList,
		datasets : [
			{
				label: "Your Price",
				backgroundColor: "rgba(54,162,235,0.2)",
				borderColor: "rgba(54,162,235,1)",
				borderWidth: 1,
				hoverBackgroundColor: "rgba(54,162,235,0.4)",
				hoverBorderColor: "rgba(54,162,235,1)",
				data : youList
			},
			{
				label: "Generic Price",
				backgroundColor: "rgba(146,208,80,0.2)",
				borderColor: "rgba(146,208,80,1)",
				borderWidth: 1,
				hoverBackgroundColor: "rgba(126,194,52,0.4)",
				hoverBorderColor: "rgba(126,194,52,1)",
				data : genericList
			}
		]
	}
	
	$('#compGraph').replaceWith('<canvas id="compGraph"></canvas>');
	var cvs = document.getElementById("compGraph").getContext("2d");

	barChart = new Chart(cvs, {
		type: 'bar',
		data: barData
	});
	
	if(menuShowing)
	{
		toggleMenu();
	}
}

function graphByRank(youData, genericData)
{
	Chart.defaults.global.maintainAspectRatio = false;
	Chart.defaults.global.tooltips.callbacks.title = labelModifierRank;
	var youList = [];
	var genericList = [];
	var labelList = [];
	var len = Math.max(youData.length, genericData.length);
	globalHotelNames = {};
	
	for(var i = 0; i < len; i++)
	{
		if(i < youData.length)
			youList.push(youData[i][0]);
		else
			youList.push(0);
			
		if(i < genericData.length)
			genericList.push(genericData[i][0]);
		else
			genericList.push(0);
			
		var label = "# " + (i+1);
		labelList.push(label);
		globalHotelNames[label+'0'] = youData[i][1];
		globalHotelNames[label+'1'] = genericData[i][1];
	}
	
	setGraphSize();
	
	var barData = {
		labels : labelList,
		datasets : [
			{
				label: "Your Price",
				backgroundColor: "rgba(54,162,235,0.2)",
				borderColor: "rgba(54,162,235,1)",
				borderWidth: 1,
				hoverBackgroundColor: "rgba(54,162,235,0.4)",
				hoverBorderColor: "rgba(54,162,235,1)",
				data : youList
			},
			{
				label: "Generic Price",
				backgroundColor: "rgba(146,208,80,0.2)",
				borderColor: "rgba(146,208,80,1)",
				borderWidth: 1,
				hoverBackgroundColor: "rgba(126,194,52,0.4)",
				hoverBorderColor: "rgba(126,194,52,1)",
				data : genericList
			}
		]
	}
	
	$('#compGraph').replaceWith('<canvas id="compGraph"></canvas>');
	var cvs = document.getElementById("compGraph").getContext("2d");

	barChart = new Chart(cvs, {
		type: 'bar',
		data: barData
	});
	
	if(menuShowing)
	{
		toggleMenu();
	}
}

function setGraphSize()
{
	var height = Math.max($(window).height() - /*$("#detailsButton").height()*/ - $(".navbar").height() - 120, 400);
	$("#subContainer").css("width", "7000px");
	$("#subContainer").css("height", height + "px");
	$(".graphContainer").css("overflow", "scroll");
}

function labelModifier(tooltipItems, data)
{
	title = data.labels[tooltipItems[0].index];
	return globalHotelNames[title];
}

function labelModifierRank(tooltipItems, data)
{
	title = data.labels[tooltipItems[0].index];
	return globalHotelNames[title + tooltipItems[0].datasetIndex];
}

var menuShowing = true;
function toggleMenu()
{
	if(menuShowing)
	{
		$("#menuArrow").removeClass("glyphicon-minus-sign");
		$("#menuArrow").addClass("glyphicon-plus-sign");
		$("#menu").animate({width:'40px'}, 400);
		menuShowing = false;
	}
	else
	{
		$("#menuArrow").removeClass("glyphicon-plus-sign");
		$("#menuArrow").addClass("glyphicon-minus-sign");
		$("#menu").animate({width:'400px'}, 400);
		menuShowing = true;
	}
}

function setGraphMode(mode)
{
	if(mode != graphType)
	{
		graphType = mode;
		buildGraph();
	}
}