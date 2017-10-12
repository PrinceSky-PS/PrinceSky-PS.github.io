

document.createElement("nav") // create "nav" element so CSS styles get properly applied to the menu's nav element in older IE browsers

var offcanvasmenu = (function($){

	var elementids = { // ids of various elements referenced by script. If modified also make corresponding changes in offcanvasmenu.css
		bodycontentwrapper: 'contentarea',
		checkbox: 'togglebox',
		checkedselector: 'checkedselectorsupport',
		canvasmenu: 'offcanvas-menu',
		navtoggler: 'navtoggler',
		menuclosebutton: 'closex'
	}

	var checkedsupport = true // test for CSS's :checked selector support

	function checkedselectorsupport() { //check for support for :checked selector
		var checkedboxwidth = $('#' + elementids.checkedselector).css('width') // if width returns 20px, the value set inside CSS for elementids.checkedselector:checked, then it's supported
	  return !!(checkedboxwidth == '20px')
	}

	function getmenucontent(options){ //function to fetch external page containing off canvas menu markup
		$.ajax({
			url: options.menucontent, //path to external menu file
			async: true,
			dataType: 'html',
			error: function(ajaxrequest){
				alert('Error fetching content. Server Response: '+ajaxrequest.responseText)
			},
			success: function(content){
				$(document.body).wrapInner('<div id="' + elementids.bodycontentwrapper +'" />')
				options.menuloaded= true
				$(content).prependTo(document.body)
				offcanvasmenu(options)
			}
		});
	}

	function offcanvasmenu(options){
		if (!options.menuloaded && options.menucontent){
			getmenucontent(options)
		}
		else{
			checkedsupport = checkedselectorsupport()
			if (!checkedsupport){
				document.getElementById(elementids.navtoggler).onclick = function(){
					offcanvasmenu.expandoffcanvasmenu('open')
				}
				document.getElementById(elementids.menuclosebutton).onclick = function(){
					offcanvasmenu.expandoffcanvasmenu('close')
				}
			}
		}
	}

	offcanvasmenu.expandoffcanvasmenu = function(action){
		if (checkedsupport){
			var togglebox = document.getElementById(elementids.checkbox)
			var newstate =	(action == 'open')? true : (action == 'close')? false : !togglebox.checked
			togglebox.checked = newstate
		}
		else{
			var nav = document.getElementById(elementids.canvasmenu)
			var newstate = (action == 'open')? 'visible' : (action == 'close')? 'hidden' : nav.style.visibility == 'hidden'? 'visible' : 'hidden'
			nav.style.visibility = newstate
		}
	}

	return offcanvasmenu

})(jQuery)
