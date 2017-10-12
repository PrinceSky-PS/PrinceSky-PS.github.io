div#contentarea{
	position: relative;
	width: 100%;
	-moz-transform: translate3d(0,0,0);
	-webkit-transform: translate3d(0,0,0);
	transform: translate3d(0,0,0);
  -moz-transition: -moz-transform 0.5s; /* transition settings. 0.5s is the slide duration */
  -webkit-transition: -webkit-transform 0.5s;
  transition: transform 0.5s;
}

input[type="checkbox"]#togglebox, input[type="checkbox"]#checkedselectorsupport {
  /* checkbox used to toggle menu state */
  position: absolute;
  left: 0;
  top: 0;
  visibility: hidden;
}

label#navtoggler{  /* Main label icon to toggle menu state */
  z-index: 9;
  display: block;
  position: relative;
  font-size: 8px;
  /* change font size to change label dimensions. Leave width/height below alone */
  width: 4em;
  height: 2.5em;
  top: 0;
  left: 0;
  text-indent: -1000px;
  border: 0.6em solid black;
  /* border color */
  border-width: 0.6em 0;
  cursor: pointer;
}


label#navtoggler::before{
  /* inner strip inside label */
  content: "";
  display: block;
  position: absolute;
  width: 100%;
  height: 0.6em;
  top: 50%;
  margin-top: -0.3em;
  left: 0;
  background: black; /* stripes background color. Change to match border color of parent label above */
}

nav#offcanvas-menu{ /* Full screen nav menu */
  width: 250px; /* width of off canvas menu */
  height: 100%;
  top: 0;
  left: 0;
	z-index: 100;
	visibility: hidden;
	-moz-transform: translate3d(-250px,0,0); /* Change -250px to -menuwidth */
	-webkit-transform: translate3d(-250px,0,0);
	transform: translate3d(-250px,0,0);
  -webkit-box-sizing: border-box;
	-moz-box-sizing: border-box;
	box-sizing: border-box;
  background: #C1F2BC;
  display: block;
  position: fixed;
	text-align: center;
	overflow: auto;
  -moz-transition: -moz-transform 0.5s, visibility 0s 0.5s; /* transition settings. 0.5s is the slide duration */
  -webkit-transition: -webkit-transform 0.5s, visibility 0s 0.5s;
  transition: transform 0.5s, visibility 0s 0.5s;
}

nav#offcanvas-menu label#closex{ /* Large x close button inside nav */
  width: 50px;
  height: 50px;
	overflow: hidden;
  display: block;
  position: absolute;
  cursor: pointer;
	text-indent: -1000px;
  z-index: 10;
  top: 0;
  right: 0;
}

nav#offcanvas-menu label#closex::before, nav label#closex::after{ /* render large cross inside close button */
  content: "";
  display: block;
  position: absolute;
  width: 100%;
  height: 6px;
  background: black;
  top: 50%;
  margin-top: -3px;
  -ms-transform: rotate(-45deg);
  -webkit-transform: rotate(-45deg);
  transform: rotate(-45deg);
}

nav#offcanvas-menu label#closex::after{ /* render large cross inside close button */
  -ms-transform: rotate(-135deg);
  -webkit-transform: rotate(-135deg);
  transform: rotate(-135deg);
}

nav#offcanvas-menu a{
	text-decoration: none;
  color: black;
  text-transform: uppercase;
}

nav#offcanvas-menu ul{
  list-style: none;
  margin-top: 200px;
	opacity: 0;
  padding: 0;
  position: relative;
  font: bold 1.5em 'Bitter', sans-serif; /* use google font inside nav UL */
  -moz-transition: margin-top 0.2s 0.3s, opacity 0.5s 0.3s; /* transition settings */
  -webkit-transition: margin-top 0.2s 0.3s, opacity 0.5s 0.3s;
  transition: margin-top 0.2s 0.3s, opacity 0.5s 0.3s;
}

nav#offcanvas-menu ul li{
  margin-bottom: 25px;
}

nav#offcanvas-menu ul li a{
  padding: 10px;
  border-radius: 20px;
}

nav#offcanvas-menu ul li a:hover{
  background: #96E082;
}

div.overlay {
  /* overlay that covers entire page when menu is open */
  position: fixed;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  opacity: 0;
  background: black;
  z-index: 99;
  visibility: hidden;
  -moz-transition: opacity 0.5s; /* transition settings */
  -webkit-transition: opacity 0.5s;
  transition: opacity 0.5s;
}

div.overlay label {
  /* label of overlay that closes menu when clicked on */
  width: 100%;
  height: 100%;
  position: absolute;
}

input[type="checkbox"]#checkedselectorsupport:checked{ /* dummy checkbox used to check support for :checked selector in JavaScript */
	width: 20px; /* keep this value as it */
}

input[type="checkbox"]#togglebox:checked ~ div#contentarea{
	margin-left: 10px;
	-moz-transform: translate3d(250px,0,0); /* Change 250px to menuwidth */
	-webkit-transform: translate3d(250px,0,0);
	transform: translate3d(250px,0,0);
}

input[type="checkbox"]#togglebox:checked ~ nav#offcanvas-menu{ /* nav state when corresponding checkbox is checked */
	-moz-transform: translate3d(0,0,0);
	-webkit-transform: translate3d(0,0,0);
	transform: translate3d(0,0,0);
	visibility: visible;
  -moz-transition-delay: 0s;
  -webkit-transition-delay: 0s;
  transition-delay: 0s;
}

input[type="checkbox"]#togglebox:checked ~ nav#offcanvas-menu ul{ /* nav state when corresponding checkbox is checked */
	margin-top: 100px;
	opacity: 1;
}

input[type="checkbox"]#togglebox:checked ~ div.overlay{
	opacity: 0.6;
  visibility: visible;
}
