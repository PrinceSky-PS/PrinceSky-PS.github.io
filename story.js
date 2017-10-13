// Created with Squiffy 5.1.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
                if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount')>= squiffy.story.section.passageCount) {
                    squiffy.story.passage('@last');
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
		link = String(link);
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
			var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
				rhs = incDecMatch[3];
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
				rhs = parseFloat(rhs);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
				if (op == '*') {
					value *= rhs;
				}
				if (op == '/') {
					value /= rhs;
				}
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
			else if (startsWith(text,'@') && !startsWith(text,'@replace')) {
				processAttributes(text.substring(1).split(","));
				return "";
			}
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);
			condition = condition.replace("<", "&lt;");
            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

				if(startsWith(rhs,'@')) rhs=squiffy.get(rhs.substring(1));
				
                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = 'c6ba990dc9';
squiffy.story.sections = {
	'_default': {
		'text': "<p>Welcome. This is a world inhabited not only by humans, but also by the mysterious and wonderful creatures known as pokémon. Roaming the land, swimming in the ocean, soaring through the skies, in towns and even in people&#39;s homes, pokémon can be found everywhere. In most cases, people and pokémon live together in harmony, helping each other and keeping each other company. Many people travel the world, befriending and capturing wild pokémon and battling with them against others like them in friendly competitions. These are the pokémon trainers. Be it in groups or alone with just their pokémon, most trainers travel across the many regions of the pokémon world, seeking to improve their skills by challenging the pokémon gyms in the towns and cities they visit and aim to participate in the prestigious pokémon leagues that each region hosts.\n<br><br></p>\n<center><b><a class=\"squiffy-link link-section\" data-section=\"Play As James Barton\" role=\"link\" tabindex=\"0\">Play As James Barton</a></b></center>",
		'passages': {
		},
	},
	'Play As James Barton': {
		'clear': true,
		'text': "<p>}</p>\n<pre><code>jAlert(&quot;Stop! Stop!&quot;, &quot;&lt;b&gt;Okay!&lt;/b&gt;&quot;);\n</code></pre><p><b>Pallet Town, Kanto\n<br>\n7:40am, 1st April 2005</b>\n<br><br></p>\n<p>The magnificent spring sun beat down upon the town of Pallet in the south of Kanto. Only a few wispy clouds could be seen as the early birds among the town&#39;s population started appearing outside their houses. A large flock of the tiny bird pokémon, pidgey, soared overhead in the direction of the imposing Mt. Hideaway to the west. The mountain itself still bore some snow, the remnants of the winter, on its highest slopes. The town itself was mostly a deep green color thanks to abundance of trees and flower gardens. There was a slight chill in the air, however - a reminder that it was not yet summer. The peace and quiet of the town was interrupted briefly as a ferry leaving Pallet&#39;s small port in the south sounded its whistle loudly as it set off to sea.\n<br><br></p>\n<p>In the north eastern suburbs of the town, inside a rectangular, pale yellow colored house, a ten year old boy was busily getting ready. He scratched his short, dark brown hair, cut the previous day, as he stared at the clothes he&#39;d laid out on his bed. He frowned as he attempted to decide what he should wear. His blue eyes showed his irritation at being unable to make a decision.\n<br><br>\n&quot;James!&quot; <i>He heard his mother call to him.</i> &quot;Are you ready for breakfast yet?&quot;\n<br><br>\n&quot;Just a minute!&quot; <i>He called back. This wasn&#39;t something that he could rush. Today was the day that he, James Burton, would receive his first pokémon. He needed to think carefully about everything.</i>\n<br><br>\n&quot;You&#39;re still not dressed yet?&quot; <i>His younger brother, <b>Tom</b>, asked as he poked his head round the door.</i>\n<br><br>\n&quot;No,&quot; <i><b>James</b> replied, shaking his head.</i>\n<br><br>\n&quot;Why don&#39;t you just wear your favourite clothes?&quot; <i><b>Tom</b> asked.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"They're\" role=\"link\" tabindex=\"0\">They&#39;re</a>&quot;</p>",
		'js': function() {
			function jAlert(text, customokay){
			document.getElementById('jAlert_content').innerHTML = text;
			document.getElementById('jAlert_ok').innerHTML = customokay;
			document.body.style.backgroundColor = "gray";
			document.body.style.cursor="wait";
		},
		'passages': {
			'They\'re': {
				'text': "<p><br>\n&quot;They&#39;re not really smart enough,&quot; <i><b>James </b>replied with a sigh.</i>\n<br><br>\n&quot;Then how about a shirt and tie?&quot;\n<br><br>\n&quot;That&#39;s a little too smart.&quot;\n<br><br>\n&quot;I didn&#39;t think that pokémon trainers needed to dress smartly,&quot; <i><b>Will</b>, the middle brother, appeared in the doorway and joined the conversation.</i> &quot;Why don&#39;t you wear the clothes Grandma got you for your birthday?&quot;\n<br><br>\n<i>James thought for a second.</i></p>\n<center><b><a class=\"squiffy-link link-section\" data-section=\"Open Gift Box\" role=\"link\" tabindex=\"0\">Open Gift Box</a> || <a class=\"squiffy-link link-section\" data-section=\"Something Else\" role=\"link\" tabindex=\"0\">Something Else</a>.</b></center>",
			},
		},
	},
	'Something Else': {
		'text': "<p>&quot;Alright,&quot; <i>he nodded, grabbing the mustard yellow T-shirt and the pair of dark blue jeans from the pile.</i> &quot;What about a jumper though?&quot;\n<br><br>\n&quot;Do you need one?&quot; <i><b>Will</b> asked.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"It's\" role=\"link\" tabindex=\"0\">It&#39;s</a>&quot;</p>",
		'passages': {
			'It\'s': {
				'text': "<p><br>\n&quot;It&#39;s still only April,&quot; <i><b>James</b> replied, giving him a look.</i> &quot;Or were you hoping that I&#39;d die from hypothermia?&quot;\n<br><br>\n&quot;How about this one?&quot; <i><b>Tom</b> picked up an unzipped and slightly faded red jacket.</i> &quot;This is Dad&#39;s old one, so it doesn&#39;t matter if you ruin it.&quot;\n<br><br>\n&quot;I won&#39;t ruin it!&quot; <i><b>James</b> snapped, snatching the jacket from his hands.</i> &quot;I&#39;m getting changed now, so both of you leave!&quot;\n<br><br>\n&quot;James!&quot; <i>their mother called again.</i>\n<br><br>\n&quot;Got it!&quot; <i><b>James</b> called back as <b>Will</b> and <b>Tom</b> trooped out of the room and went downstairs. He quickly pulled on his clothes and hurried <a class=\"squiffy-link link-section\" data-section=\"Downstairs\" role=\"link\" tabindex=\"0\">Downstairs</a> to join them.</p>",
			},
		},
	},
	'Open Gift Box': {
		'text': "<p><center><b><i>James opened the gift box</i></b></center>\n<br><br>\n&quot;Alright,&quot; <i>He nodded, as he took out the mustard red T-shirt and the pair of dark blue jeans from the pile.</i>\n<br><br>\n&quot;Do you need a jacket?&quot; <i><b>Will</b> asked.</i>\n<br><br>\n&quot;No thanks, it&#39;s only april&quot;\n<br><br>\n<i><b>Will</b> showed <b>James</b> an unzipped dark blue colored jacket.</i>&quot;It was a gift from serena, Are you sure you don&#39;t want it?&quot; <i><b>Will</b> said teasingly</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"How\" role=\"link\" tabindex=\"0\">How</a>&quot;</p>",
		'passageCount': 1,
		'passages': {
			'How': {
				'text': "<p><br>\n&quot;How did you got that!&quot; <i><b>James</b> said, quickly snatching the jacket.</i>\n<br><br>\n&quot;I&#39;m changing clothes now, so both of you leave&quot; <i><b>James</b> said embarresed.</i>\n<br><br>\n&quot;James&quot; <i>their mother called again as <b>tom</b> and <b>will</b> trooped out of the room and went downtairs.\n<br><br><i>He remembered the moment when serena gave him the gift.</i></p>",
			},
			'@last': {
				'text': "<p><br>\n<i>He quickly changed his clothes and went <a class=\"squiffy-link link-section\" data-section=\"Downstairs\" role=\"link\" tabindex=\"0\">Downstairs</a>.</p>",
			},
		},
	},
	'Downstairs': {
		'clear': true,
		'text': "<p>&quot;You need to be at the lab for 9 o&#39;clock, right?&quot; <i>James&#39; mom, <b>Elizabeth</b>, checked with him as he sat down and took a bite out of his bacon and egg sandwich. He quickly swallowed the mouthful.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"That's right\" role=\"link\" tabindex=\"0\">That&#39;s right</a>,&quot; he nodded.</p>",
		'passages': {
			'That\'s right': {
				'text': "<p>&quot;What time is it now?&quot;\n<br><br>\n&quot;Eight,&quot; <i><b>Elizabeth</b> replied</i>. &quot;It&#39;s better to get there earlier rather than later, so I think you should set off as soon as you&#39;re done eating.&quot;\n<br><br>\n&quot;Alright,&quot; James nodded.\n<br><br>\n&quot;Morning, everyone!&quot; <i><b>James</b>&#39; dad, <b>Patrick</b>, grinned as he came into the kitchen.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Morning!\" role=\"link\" tabindex=\"0\">Morning!</a>&quot;<i> Everyone else called back as he sat down at the dinner table. In James&#39; home, the dining room and kitchen were both in a single, long room which ran from the front of the house to the back. The front third was the kitchen, with doors both to the front hall and outside, while the dining room made up the remaining two thirds. A line of counters marked the dividing line between the two, which a gap on one side to allow movement between the two sections.</i></p>",
			},
			'Morning!': {
				'text': "<p>&quot;How are you feeling this morning?&quot;<i><b> Patrick</b> asked <b>James</b>.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Ner...\" role=\"link\" tabindex=\"0\">Ner...</a>&quot;</p>",
			},
			'Ner...': {
				'text': "<p>&quot;Nervous&quot; <i><b>James</b> admitted.</i> \n<br><br>\n&quot;But excited at the same time.&quot;\n<br><br>\n&quot;That&#39;s to be expected!&quot; <i><b>Patrick </b>laughed, patting him on the shoulder. </i>\n<br><br>\n&quot;I look forward to meeting your first pok��mon when I get back from work.&quot;\n<br><br>\n&quot;Sure,&quot; <i><b>James</b> nodded. He stood up as he finished his breakfast and took his plate over to the dishwasher. </i>\n<br><br>\n&quot;I&#39;ll be back as soon as I&#39;m done at the lab!&quot; <i>he called to<b> Elizabeth</b>.</i>\n<br><br>\n&quot;Alright!&quot; <i><b>Elizabeth</b> smiled back at him.</i> &quot;Good luck!&quot;\n<br><br>\n&quot;Thanks!&quot; <i><b>James</b> grinned back before setting off for the <a class=\"squiffy-link link-section\" data-section=\"pokemon lab\" role=\"link\" tabindex=\"0\">pokemon lab</a>.</i></p>",
			},
		},
	},
	'pokemon lab': {
		'clear': true,
		'text': "<p><i>While heading towards the pokèmon lab, <b>James</b> heard someone shouting HELP.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Someone\" role=\"link\" tabindex=\"0\">Someone</a>&quot;</p>",
		'passages': {
			'Someone': {
				'text': "<p>&quot;Someone is in trouble, I must help!&quot; <i><b>James</b> though, as he ran towards <a class=\"squiffy-link link-passage\" data-passage=\"route 1\" role=\"link\" tabindex=\"0\">route 1</a>.</i></p>",
			},
			'route 1': {
				'text': "<p><i>He reached route 1 and  saw group of pidgey&#39;s attacking an unknown girl.</b>\n<br><br>\n&quot;I must help her!&quot; <i><b>He</b> said, picking up a stone.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Run!\" role=\"link\" tabindex=\"0\">Run!</a>&quot;</p>",
			},
			'Run!': {
				'text': "<p>&quot;Run!&quot; <i><b>He </b>shouted while throwing a stone at group of pidgey&#39;s.</i></p>",
			},
			'@3': {
				'text': "<p><i>She <a class=\"squiffy-link link-passage\" data-passage=\"ran\" role=\"link\" tabindex=\"0\">ran</a> back towards viridian city.</i></p>",
			},
			'ran': {
				'text': "<p>&quot;That was close but she is safe now&quot; <i><b>James</b> thought, as he started heading back towards <a class=\"squiffy-link link-section\" data-section=\"the pokemon lab\" role=\"link\" tabindex=\"0\">the pokemon lab</a>.</i></p>",
			},
		},
	},
	'the pokemon lab': {
		'clear': true,
		'text': "<p><b>8:55am, 1st April 2005</b>\n<br><br>\n&quot;Looks like you finally showed up!&quot;\n<br><br>\n<i><b>James</b> let out an exasperated sigh as he walked up the steps to the lab entrance.</i> &quot;I&#39;m still just as early as you Dean!&quot; <i>he replied loudly.</i>\n<br><br>\n<i><b>Dean Adams</b>, a slightly skinnier boy than James, had dark brown eyes and lightish brown hair, cut short like James&#39;. He was wearing a dark green T-shirt and a pair of black shorts which reached to just under his knees. He also had a backpack on his back.</i>\n<br><br>\n&quot;I&#39;m surprised you actually showed up in the end!&quot; <i><b>Dean</b> laughed</i>. &quot;Everyone knows that you&#39;re only getting a pokémon because everyone else is!&quot;\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"And?\" role=\"link\" tabindex=\"0\">And?</a>&quot;</p>",
		'passages': {
			'And?': {
				'text': "<p>&quot;And?&quot; <i><b>James </b>replied coldly. </i>&quot;Even if I&#39;m only going to be a casual trainer, I&#39;ll still be able to beat you.&quot;\n<br><br>\n<i><b>James</b> and<b> Dean</b> had known each other since James had first moved to Pallet Town and started school there. They&#39;d once been friends. Rather childishly, however, an intense rivalry had begun between them when they both developed a crush on the same girl. The rivalry had continued, maybe even intensified, even after the girl had moved away to another region.</i>\n<br><br>\n&quot;I&#39;ll believe it when I see it!&quot; <i><b>Dean</b> laughed mockingly.</i>\n<br><br>\n<i>Just as <b>James</b> was about to respond, they heard the door open. An ageing man in his fifties with grey hair and a lab coat emerged.</i>\n<br><br>\n&quot;I thought I heard the two of you out here,&quot;<i> he smiled at them.</i> &quot;Come on in, James, Dean,&quot;<i> he gestured to the door behind him.</i>\n<br><br>\n&quot;Thanks, Professor Oak,&quot; <i><b>James </b>replied, following him in. Professor Oak was one of the leading figures in pokémon research, renowned worldwide. He was popularly known as the &#39;Pokémon Professor&#39;.</i>\n<br><br>\n&quot;So, where are the pokémon?&quot; <i><b>Dean</b> asked as they passed a room full of electrical machines which two of Oak&#39;s assistants were working with.</i>\n<br><br>\n&quot;Just through here,&quot; <i><b>Oak </b>replied, leaving them into a well-lit room at the centre of which stood a small coffee table and two sofas either side of it. Atop the table were three balls. The top halves of these balls were red and the bottom halves were white. At the dividing line between the two halves, there were small buttons.</i>\n<br><br>\n&quot;These are pokéballs,&quot; <i><b>Oak</b> explained, gently scooping up the first one.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"We\" role=\"link\" tabindex=\"0\">We</a>&quot;</p>",
			},
			'We': {
				'text': "<p>&quot;We know what pokéballs are, Professor,&quot; <i><b>James</b> pointed out to him.</i>\n<br><br>\n&quot;Yeah.&quot; <i><b>Dean </b>nodded.</i> &quot;They&#39;re used to catch and store pokémon. One of the starter pokémon is in that one, right?&quot;\n<br><br>\n&quot;That&#39;s right.&quot; <i><b>Oak</b> nodded.</i>\n<br><br>\n&quot;This one is the grass type pokémon, bulbasaur.&quot; <i> He clicked the button on the front of the pokéball and it popped open. A glowing lump of energy shining a bright blue colour burst out of the ball. It reshaped itself as it reached the floor. There was a burst of sparks and a small, four-legged pokémon with a bluish green body, red eyes and a large green bulb on its back appeared.</i>\n<br><br>\n&quot;Bulllbaah!&quot; <i>it cried, looking around before noticing the new trainers and standing to attention.</i>\n<br><br>\n&quot;Cool!&quot; <i><b>James</b> grinned.</i>\n<br><br>\n&quot;This next one is charmander, the fire type pokémon.&quot; <i><b>Oak</b> continued, picking up the next pokéball.</i> &quot;You should be a little more cautious with this one,&quot; <i>he added as the ball of energy burst out of the pokéball and reshaped itself.</i>\n<br><br>\n&quot;Chaaaar?&quot; <i>Charmander, an orange biped lizard with a rounded head and a flame on the tip of its tail, also looked around before standing to attention.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"This\" role=\"link\" tabindex=\"0\">This</a>&quot;</p>",
			},
			'This': {
				'text': "<p>&quot;This one&#39;s really awesome as well!&quot; <i><b>James</b> sighed.</i> &quot;I don&#39;t know which to pick!&quot;\n<br><br>\n&quot;Why don&#39;t you wait until after you&#39;ve seen the third pokémon before making the decision?&quot;<i><b> Dean</b> asked, shaking his head. </i>\n<br><br>\n&quot;I worry about you sometimes, James,&quot; <i>he added with a fake pitying look.</i>\n<br><br>\n&quot;Hey! At least I&#39;m expressing an interest!&quot; <i><b>James</b> snapped in response.</i>\n<br><br>\n<i>The bulbasaur and charmander shared a worried look as <b>Oak</b> released the third pokémon.</i> &quot;This one is the water pokémon, squirtle,&quot; <i>he explained as a small biped turtle with a light blue body and a brown shell appeared. </i>\n<br><br>\n&quot;So, which one will each of you choose as your first partner?&quot;\n<br><br>\n<i><b>James</b> and<b> Dean</b> both looked intently between the three pokémon. Dean spoke first.</i>\n<br><br>\n&quot;I choose the squirtle as my starter,&quot; <i>he said to <b>Oak</b>.</i>\n<br><br>\n&quot;A fine choice,&quot; <i><b>Oak</b> replied, handing him the squirtle&#39;s pokéball.</i> &quot;Make sure to take good care of him.&quot;\n<br><br>\n&quot;I will.&quot;<i><b> Dean</b> nodded.</i> &quot;Thanks, Professor.&quot;\n<br><br>\n&quot;How about you, James?&quot; <i><b>Oak </b>asked him.</i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"I\" role=\"link\" tabindex=\"0\">I</a>&quot;</p>",
			},
			'I': {
				'text': "<p>&quot;I think, I&#39;ve decided&quot; <i><b>James</b> said, as he walked closer to both pokemons.</i></p>\n<center><b><a class=\"squiffy-link link-section\" data-section=\"Charmander\" role=\"link\" tabindex=\"0\">Charmander</a> || <a class=\"squiffy-link link-section\" data-section=\"Bulbasaur\" role=\"link\" tabindex=\"0\">Bulbasaur</a>.</b></center>",
			},
		},
	},
	'Bulbasaur': {
		'text': "<p>&quot;Do you want to travel with me Bulbasaur?&quot; <i><b>James</b> asked.</i>\n<br><br>\n&quot;bulba!&quot; <i>Bulbasaur refused to travel with him.</i>\n<br><br>\n&quot;It&#39;s sad to see bulbasaur, didn&#39;t want to travel with you,&quot; <i><b>Oak</b> replied giving you a sad look.</i>\n<br><br>\n&quot;Why don&#39;t you ask charmander, if he want to travel with you or not?&quot; </p>\n<p>&quot;Yeah, I&#39;ll ask <a class=\"squiffy-link link-section\" data-section=\"Charmander\" role=\"link\" tabindex=\"0\">Charmander</a>.&quot; <i>He replied sadly.</i></p>",
		'passages': {
		},
	},
	'Charmander': {
		'text': "<p>&quot;Do you want to travel with me Charmander?.&quot; <i><b>James</b> asked while patting charmander on head.</i>\n<br><br>\n&quot;Chaaar!&quot; <i>Charmander gave an eager nod in response.</i> \n<br><br>\n&quot;It looks like charmander want to travel with you,&#39; <i><b>Oak</b> remarked with a smile.</i>\n<br><br>\n&quot;Though make sure that you take care when handling him.&quot; <i>he handed you the charmander&#39;s <a class=\"squiffy-link link-passage\" data-passage=\"pokeball\" role=\"link\" tabindex=\"0\">pokeball</a>.</i></p>",
		'passages': {
			'pokeball': {
				'text': "<p><center><b><i>James recevied charmander&#39;s pokèball from Professor Oak.</i></b></center>\n<br><br>\n&quot;Great!&quot; <i>He grinned. </i>\n<br><br>\n&quot;Before I forget,&quot;<i> he said.</i> &quot;here are your <a class=\"squiffy-link link-section\" data-section=\"trainer\" role=\"link\" tabindex=\"0\">trainer</a> cards.&quot;</p>",
			},
		},
	},
	'trainer': {
		'text': "<p><br></p>\n<p><center><b><i>James and Dean received trainer card from Professor Oak.</i></b></center>\n<br><br>\n&quot;Thanks professor&quot; <i>He replied.</i>\n<br><br>\n&quot;Take good care of it - you&#39;ll need that to enter any official competitions and get free treatment for your pokemons at pokemon centre.&quot; \n<br><br>\n&quot;Alright,&quot;<i><b> Dean </b>grinned as he recalled Squirtle to his pokeball.</i> &quot;James do you want to battle?&quot;\n<br><br></p>\n<p><center><b> <a class=\"squiffy-link link-section\" data-section=\"Sure\" role=\"link\" tabindex=\"0\">Sure</a> || <a class=\"squiffy-link link-section\" data-section=\"No\" role=\"link\" tabindex=\"0\">No</a>.</b></center>\n<br></p>",
		'passages': {
		},
	},
	'Sure': {
		'text': "<p>&quot;Sure!&quot; <i><b>James</b> grinned determinedly back.</i> &quot;I&#39;ll prove to you that I can still beat you as a casual trainer!&quot; \n<br><br>\n&quot;We&#39;ll see about that!&quot; <i><b>Dean</b> laughed. </i>\n<br><br>\n&quot;I&#39;ll act as your referee,&quot; Oak said. &quot;Come this way.&quot; \n<br><br>\n<i><b>James </b>quickly recalled your charmander and three of you walked out to the <a class=\"squiffy-link link-section\" data-section=\"back of the lab\" role=\"link\" tabindex=\"0\">back of the lab</a>.</i>\n<br></p>",
		'passages': {
		},
	},
	'No': {
		'text': "<p>&quot;No thanks&quot; <i><b>James</b> replied calmly. </i>\n<br><br>\n&quot;I knew it, you&#39;re afraid of me.&quot; <i><b>Dean</b> replied, giving you a look. </i>\n<br><br>\n&quot;I&#39;m not afraid of you, let&#39;s do it&quot; <i><b>He replied annoyingly. </i>\n<br><br>\n&quot;Calm down kids, I&#39;ll act as your referee,&quot; <i><b>Oak</b> said. </i>&quot;Come this way.&quot; \n<br><br>\n<i><b>James</b>quickly recalled your charmander and three of you walked out to fhe <a class=\"squiffy-link link-section\" data-section=\"back of the lab\" role=\"link\" tabindex=\"0\">back of the lab</a>.</i>\n<br></p>",
		'passages': {
		},
	},
	'back of the lab': {
		'clear': true,
		'text': "<p><i><b>James</b> and <b>Dean</b> took position opposite each other on the grass while Oak stood at the side halfway between the two of you.</i>\n<br><br>\n&quot;This is awesome!&quot; <i><b>Dean</b> grinned.</i> &quot;I&#39;m finally going to fight my first pokémon battle!&quot; \n<br><br>\n&quot;Hey! It&#39;s my first battle as well!&quot; <i><b>James</b> reminded him. </i>\n<br><br>\n&quot;Shame that you&#39;re going to lose it!&quot; <i><b>Dean </b>taunted. </i>\n<br><br>\n&quot;This is going to be a one-on-one battle between Dean Adama and James Burton!&quot; <i><b>Oak</b> announced.</i>\n<br><br>\n&quot;The battle will be over when one side&#39;s pokémon is unable to battle! When you&#39;re ready!&quot; \n<br><br>\n&quot;Go, Squirtle!&quot; <i><b>Dean</b> called, throwing out his pokéball. </i>\n<br><br>\n&quot;Squirrrtle&quot; <i>Squirtle cried as he burst out of the ball and landed softly on the grass. </i>\n<br><br>\n&quot;Go, Charmander!&quot; <i><b>James</b> called as he threw Kaze&#39;s ball out as well. </i>\n<br><br>\n&quot;Chaaar&quot;<i> charmander cried eagerly as he burst out of the ball and landed softly on the ground. The two pokémon stared at each other as they waited for their first orders. </i>\n<br><br>\n&quot;Use Tackle!&quot; <i><b>Dean </b>shouted, breaking the standoff. </i>\n<br><br>\n&quot;Squirtleee&quot; <i>Squirtle nodded and started charging towards Charmander, preparing to slam into him. </i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Use Growl!\" role=\"link\" tabindex=\"0\">Use Growl!</a>&quot; <i><b>James</b> called, remembering that Growl, one of a charmander&#39;s starting moves, would lower Squirtle&#39;s attacking power.</i>\n<br></p>",
		'passages': {
			'Use Growl!': {
				'text': "<p><br>\n<i>Charmander growled as Squirtle appeared, his feet thudding quietly on the ground. </i>\n<br><br>\n<i>Squirtle only seemed slightly fazed by kaze&#39;s growling and smashed into him regardless, sending the lizard pokémon flying back. </i>\n<br><br>\n&quot;Are you alright, Charmander?&quot; <i><b>James</b> called as charmander landed on his back with a thud. </i>\n<br><br>\n<i>Charmander quickly pulled himself to his feet and gave you a reassuring nod. </i>\n<br><br>\n&quot;Alright, use <a class=\"squiffy-link link-passage\" data-passage=\"Scratch!\" role=\"link\" tabindex=\"0\">Scratch!</a>&quot; <i><b>James</b> ordered, as he thought Growl may have slightly lowered the effectiveness of Squirtle&#39;s moves, but he wouldn&#39;t get anywhere if he didn&#39;t go on the offensive and deal damage of their own.</i></p>",
			},
			'Scratch!': {
				'text': "<p><br>\n&quot;Chaaaar!&quot;<i> Charmander raised his right hand. His claws glinted in the sunlight as he started charging towards Squirtle. </i>\n<br><br>\n&quot;Dodge it!&quot; <i><b>Dean</b> ordered. </i>\n<br><br>\n&quot;Sqquiirtt!&quot; <i>Squirtle waited until Charmander was almost on top of him before diving to one side. He rolled in the air, causing him to land on his shell. The momentum led to the shell tipping down and sending him up into the air again, where he righted himself and landed softly on his feet. </i>\n<br><br>\n&quot;Now use Tail Whip!&quot; <i><b>Dean</b> immediately called while James and Charmander were still stunned by the dodge. </i>\n<br><br>\n&quot;Sqquiirtt!&quot; <i>Squirtle jumped around and started wagging his tail cutely at Charmander. </i>\n<br><br>\n&quot;And now use Tackle!&quot; <i><b>Dean </b>shouted. </i>\n<br><br>\n&quot;Sqquirtt!&quot; Squirtle jumped around again and shot towards Charmander. \n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Quick-\" role=\"link\" tabindex=\"0\">Quick-</a>&quot;<i> He began to try and give Charmander an order, but it was already too late.</i></p>",
			},
			'Quick-': {
				'text': "<p><br>\n&quot;Chaaaaar!&quot; <i>Charmander cried in pain as he was hit and thrown back. </i>\n<br><br>\n&quot;Looks like this battle&#39;s more or less mine!&quot; <i><b>Dean</b> laughed as Charmander pulled himself back to his feet. </i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Use Scratch!\" role=\"link\" tabindex=\"0\">Use Scratch!</a>&quot; <i>He called to Charmander.</i>\n<br></p>",
			},
			'Use Scratch!': {
				'text': "<p>&quot;Chaaaar!&quot;<i> Charmander nodded and charged forwards, his claw raised once again. </i>\n<br><br>\n&quot;Dodge it.&quot;<i><b> Dean</b> instructed Squirtle dismissively. </i>\n<br><br>\n&quot;Sqquuiirtt!&quot; <i>Squirtle jumped to one side again, though he didn&#39;t repeat his elaborate performance from the previous attack. </i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Use Scratch again!\" role=\"link\" tabindex=\"0\">Use Scratch again!</a>&quot; <i>He ordered, fearing another counter attack from Squirtle.</i>\n<br></p>",
			},
			'Use Scratch again!': {
				'text': "<p><br>\n &quot;Chaaaaar!&quot;<i> Charmander halted and turned before lunging towards Squirtle again. </i>\n<br><br>\n&quot;Dodge it again.&quot; <i><b>Dean</b> repeated his previous order. &quot;Now use Tackle,&quot; he added as Squirtle spun on one leg to move out of the way of Charmander&#39;s attack. </i>\n<br><br>\n&quot;Sqquirrt!&quot; <i>Squirtle immediately propelled himself into Charka&#39;s exposed flank and knocked him down. </i>\n<br><br>\n&quot;<a class=\"squiffy-link link-passage\" data-passage=\"Use\" role=\"link\" tabindex=\"0\">Use</a> Scratch!&quot; <i> He called. </i></p>",
			},
			'Use': {
				'text': "<p><br>\n&quot;Chaaaaar!&quot; <i>Charmander swiped at Squirtle&#39;s legs, catching both him and Dean off guard. </i>\n<br><br>\n&quot;Are you alright, Squirtle?&quot;<i><b> Dean</b> called as Squirtle dropped to one knee and Charmander pulled himself to his feet. </i>\n<br><br>\n&quot;Sqqquuiirrrtt!&quot; <i>Squirtle pulled himself back to his feet as well and gave Dean a reassuring nod. </i>\n<br><br>\n&quot;Use Tackle!&quot; <i><b>Dean</b> immediately shouted. </i>\n<br><br>\n&quot;Sqqquuiirtt!&quot; <i>Squirtle charged towards Charmander again, striking him in the chest and knocking him back again, though he remained on his feet. He was clearly flagging, however. His body was covered in bruises from Squirtle&#39;s attacks and he was breathing heavily. At that moment, however, the flame on his tail suddenly flared up and grew far larger. </i>\n<br><br>\n&quot;Charmander&#39;s Blaze ability,&quot;<i><b> Oak</b> murmured. </i>\n<br><br>\n&quot;Chaaaaar!&quot; <i>Charmander cried. He suddenly fired a blast of fiery embers towards Squirtle, catching him off guard and hitting him directly. </i>\n<br><br>\n&quot;Sqqquiirttt!&quot; <i>Squirtle cried in pain before collapsing backwards. </i>\n<br><br>\n&quot;Squirtle is unable to battle, so thr winner is Charmander!&quot; &quot;The winner of this match is James!&quot; \n<br><br>\n&quot;No way!&quot; <i><b>Dean </b>protested.</i> &quot;How? I was winning!&quot; \n<br><br>\n&quot;Charmander has an ability called Blaze,&quot; <i><b>Oak</b> explained.</i> &quot;When its health runs low, it causes its fire type moves to become more powerful.&quot; \n<br><br>\n&quot;Your charmander doesn&#39;t know any fire type moves! You must have cheated!&quot;<i><b> Dean</b> shouted. </i>\n<br><br>\n&quot;Now, now, Dean!&quot;<i><b> Oak</b> called. </i>&quot;I agree that James was incredibly lucky, but he won fair and square!&quot; \n<br><br>\n&quot;I won&#39;t forget this, James!&quot; <i><b>Dean</b> growled, ignoring Oak. He recalled Squirtle and started walking away.</i> &quot;I&#39;ll defeat you next time! Then you&#39;ll be sorry!&quot; \n<br><br>\n&quot;Stop being such a sore loser!&quot; <i><b>James</b> yelled after him. </i>\n<br><br>\n&quot;Don&#39;t make the situation any worse, James,&quot; <i><b>Oak</b> sighed as Dean disappeared from sight. </i>\n<br><br>\n&quot;Great work, Charmander,&quot;<i> He knelt down to pat Charmander on the head. </i>\n<br><br>\n&quot;Chaaar!&quot; <i>Charmander replied cheerfully, but tiredly. </i>\n<br><br>\n&quot;Anyway, congratulations on your victory, James,&quot; <i><b>Oak </b>said. </i>&quot;It looks like your Charmander has learnt how to use Ember as well.&quot; \n<br><br>\n&quot;Thanks, Professor,&quot; <i>He replied with a grin as you recalled Charmander to his pokéball. </i>\n<br><br>\n&quot;That reminds me,&quot; <i><b>Oak</b> suddenly exclaimed.</i> &quot;Can I ask you to do me a favour?&quot; \n<br><br>\n&quot;What do you need me to do?&quot; <i>He asked. </i>\n<br><br>\n&quot;There was supposed to be a third new trainer coming here to pick up her first pokémon,&quot; <i><b>Oak</b> explained.</i> &quot;However, her parents called earlier to tell me that she couldn&#39;t make it here. So I&#39;d like you to take the bulbasaur from earlier and deliver it to her.&quot; \n<br><br>\n&quot;That shouldn&#39;t be a problem,&quot; <i>He replied</i>. &quot;Where does she live?&quot; \n<br><br>\n&quot;Viridian City,&quot; <i><b>Oak</b> replied. </i>&quot;Just at the other end of Route 1. It&#39;s no more than a days&#39; hike away.&quot; \n<br><br>\n&quot;That&#39;s fine.&quot; <i>He nodded.</i> &quot;An adventure like that could be fun!&quot; \n<br><br>\n&quot;Glad to hear it.&quot;<i><b> Oak </b>smiled.</i> &quot;Her name is Amanda Weston,&quot; <i>he explained, as he handed him the bulbasaur&#39;s pokéball and a trainer card. </i>\n<br><br>\n&quot;Got it.&quot; <i>He nodded again</i>. &quot;I&#39;ll get Bulbasaur there as quickly as I can!&quot; \n<br><br>\n&quot;Good luck!&quot; <i><b>Oak</b> smiled as You set off back towards <a class=\"squiffy-link link-section\" data-section=\"home\" role=\"link\" tabindex=\"0\">home</a>.</i></p>",
			},
		},
	},
	'home': {
		'clear': true,
		'text': "<center><b>Thanks for playing my gamebook, Feel free to give reviews. :)</b></center>",
		'passages': {
		},
	},
}
})();