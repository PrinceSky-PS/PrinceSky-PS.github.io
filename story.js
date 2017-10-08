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
squiffy.story.id = '82dbd86b8d';
squiffy.story.sections = {
	'_default': {
		'text': "<center><font size=\"6\"><b><u>Pokemon Journey</b></u></font><br></center>\n<br>\nWelcome this is the world inhabited not only by humans, but also by the mysterious and wonderful creatures know as <b>Pokèmon</b>. Roaming the land, swimming in the ocean, soaring through the skies, in towns and even in people&#39;s homes, pokèmon can be found everywhere. In most cases people and pokèmon lives together in harmony, helping each other and keeping each other company. Many people travel the world, befriending and capturing the wild pokèmons and battle with them with others, like them in friendly compititons. Those are the pokèmon trainers, be it in groups or alone with their pokèmon, most trainers travel across many regions in the pokèmon world, seeking to improve their skills by challenging pokemon gyms in the towns and the cities they visit, in the aim to participte in the prestigioes <b>Pokèmon Leagues</b>, that each regions hosts.<br>\n<center><b><u><a class=\"squiffy-link link-section\" data-section=\"Let's Get Started\" role=\"link\" tabindex=\"0\">Let&#39;s Get Started</a></u></b></center>",
		'passages': {
		},
	},
	'Let\'s Get Started': {
		'text': "<p><b>Pallet Town, Kanto.<br>\n7:30am, 1st April 2017.</b><br><br>\nThe magnificent beat down upon the town of pallet in the south of kanto. Only the few wispy clouds could be seen as the early bird&#39;s among the town&#39;s population started appearing out of their houses. A large flock of tiny bird pokèmon, <b>pidgey</b>, soared overhead in the direction of imposing Mt. Hideway to the west. The town itself  was mostly of deep green colour, thanks to abundance of trees and flower gardens. There was a slight chill in the air. However a reminder that it was not yer summer. The peace and quiet of the town was interrupted briefly as a ferry leaving, Pallet&#39;s small port in the south, sounded it&#39;s whistle loudly as it sets at the sea.<br><br>\nIn the north western suburbs of town, inside a rectangular pale yellow coloured house, a twovelve year old boy was busily getting ready. He scratched, short brown hair, cut the previous day, as he stared at the clothes, He&#39;d laid down on his bed, he frowned as he attempted to decide, what he should wear, His blue eyes showed his irritation at being unable to make dicision.<br>\n&quot;James!&quot; You heard your mother calling.<br>\n&quot;Are you ready for breakfast yet?&quot;<br><br>\n&quot;You&#39;re still not dressed yet?&quot; Your younger brother, <b>Tom</b> asked as he poked his head round the door.<br><br>\n&quot;No&quot;, You replied, shaking your head.<br><br>\n&quot;Why don&#39;t you just wear your favorite clothes?&quot;, <b>Tom</b> asked.<br><br>\n&quot;They&#39;re not really smart enough&quot;, You replied with a sigh.<br><br>\n&quot;Then how about a shirt and tie?&quot;<br><br>\n&quot;That&#39;s a little smart.&quot;<br><br>\n&quot;I didn&#39;t think that pokèmon trainers needed to dress smartly&quot;, <b>Will</b> your middle brother, appeared in the doorway and joined the conversation.<br>\n&quot;Why don&#39;t you wear the clothes that grandma got you for your birthday?&quot;<br><br>\nYou thought for a second.<br><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Wear Grandma's Gifted Clothes\" role=\"link\" tabindex=\"0\">Wear Grandma&#39;s Gifted Clothes</a><br> <a class=\"squiffy-link link-section\" data-section=\"Wear Something From Pile Of Clothes\" role=\"link\" tabindex=\"0\">Wear Something From Pile Of Clothes</a></u></b></center></p>",
		'passages': {
		},
	},
	'Wear Grandma\'s Gifted Clothes': {
		'text': "<p>&quot;Alright&quot;, You nodded, grabbing the yellow T-shirt and thr pair of dark blue jeans from the box, grandma gifted you on your birthday.<br><br>\n&quot;Do you want a jacket?&quot;, <b>Will</b> asked.<br><br>\n&quot;It&#39;s still only april&quot;, You replied, giving him a look. &quot;Or were you hoping that I&#39;d die from hypothermia?&quot;<br><br>\n&quot;How about this one?&quot;, <b>Tom</b> picked up an unzipped and slightly faded red jacket. &quot;This is Dad&#39;s old one, so it doesn&#39;t matter if you ruin it&quot;<br><br>\n&quot;I won&#39;t ruin it&quot;, You snapped, snatching the jacket from his hands. &quot;I&#39;m getting changed now, so both of you leave!&quot;<br><br>&quot;James!&quot;, Their <b>mother</b> called again.\n<br><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Go Downstairs\" role=\"link\" tabindex=\"0\">Go Downstairs</a></u></b></center></p>",
		'passages': {
		},
	},
	'Wear Something From Pile Of Clothes': {
		'text': "<p>&quot;Alright&quot;, You nodded, grabbing the mustard dark blue T-shirt and the pair of black jeans from the pile.<br><br>\n&quot;Do you need a jacket?&quot;, <b>Will</b> asked.<br><br>\n&quot;No thanks, It&#39;s still only april&quot;, You replied, giving him a smile.<br><br>\n&quot;James!&quot;, Their <b>mother</b> called again.<br><center><b><u><a class=\"squiffy-link link-passage\" data-passage=\"Turn On Tv\" role=\"link\" tabindex=\"0\">Turn On Tv</a></u></b></center></p>",
		'passages': {
			'Turn On Tv': {
				'text': "<p>&quot;In a minute&quot;, You called back, as <b>tom</b> and <b>will</b> trooped out of the room and went downstairs. You quickly pulled on your clothes and turned on the tv.<br><br><center><b>Reporter:</b> Broadcasting live from <b>cerulean city</b> gym, few moments ago we watched, intense battle between the cerulean city gym leader <b>Misty</b> and trainer <b>Alan</b>, who is from kalos region, that&#39;s all for today, see you tomorrow at the same time.</center><br>&quot;Ah, It&#39;s over already, I should go downstairs or mom will shout again&quot; You said and started going downstairs.<br><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Go Downstairs\" role=\"link\" tabindex=\"0\">Go Downstairs</a></u></b></center></p>",
			},
		},
	},
	'Go Downstairs': {
		'text': "<p>&quot;You need to be at the lab before 9&#39;O clock right?&quot;, Your mom, checked with you as you sat down and took a bite of your bacon and egg sandswitch. You quickly swallowed the mouthful.<br><br>\n&quot;That&#39;s right&quot;, You nodded, &quot;What time it is now?&quot;<br><br>\n&quot;Eight&quot;, Mom replied, &quot;It&#39;s better to get there early rather than later, so i think you should set off as soon as you finish eating.&quot;<br><br>\n&quot;Alright&quot;, You replied.<br><br>\n&quot;Morning, Everyone&quot;, Your dad <b>Peter</b> grinned, as he came into the kitchen.<br><br>\n&quot;Morning!&quot;, everyone else called back as he sat down at the dinner table. In your&#39;house, the dinning room and kitchen were both in a single, long room which ran from the front of the house to the back. The front third was the kitchen, with doors both to the front hall and outside, while the dinning room made up the remaining two thirds. A line of counters marked the dividing line between the two, which a gap on one side to allow movement between the two sections.<br><br>\n&quot;How are you feeling?&quot;, Dad asked you.<br><br>\n&quot;Nervous&quot;, You admitted. &quot;But excited at the same time.&quot;<br><br>\n&quot;That&#39;s to be expected!&quot;, Dad laughed, patting you on the shoulder. &quot;I look forward to meeting your first pokemon when i get back from work.&quot;<br><br>\n&quot;Sure&quot;, You nodded, you stood up as you finished your breakfast and took your plate over to thr dishwasher5. &quot;I&#39;ll be back soon as I&#39;m done at thd lab!&quot; You called to mom.<br><br>\n&quot;Alright&quot;, Mom smiled back at you. &quot;Good Luck!&quot;<br><br>\n&quot;Thanks&quot;, You grinned back before running out of home.<br></p>\n<center><u><b><a class=\"squiffy-link link-section\" data-section=\"Go To Pokemon Lab\" role=\"link\" tabindex=\"0\">Go To Pokemon Lab</a></b></u></center>",
		'passages': {
		},
	},
	'Go To Pokemon Lab': {
		'text': "<p>You looked at your watch and the time is 8:30am. &quot;It will be too early to go at the lab, so what should i do?&quot;, You thought, while standing in middle of the town.<br><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Go To Flower Garden\" role=\"link\" tabindex=\"0\">Go To Flower Garden</a><br><a class=\"squiffy-link link-section\" data-section=\"Go Towards Route 1\" role=\"link\" tabindex=\"0\">Go Towards Route 1</a></u></b></center></p>",
		'passages': {
		},
	},
	'Go To Flower Garden': {
		'text': "<p>You decided to go at the flower garden, while heading towards flower garden, you saw a <a class=\"squiffy-link link-passage\" data-passage=\"girl singing\" role=\"link\" tabindex=\"0\">girl singing</a> and an <a class=\"squiffy-link link-passage\" data-passage=\"old man\" role=\"link\" tabindex=\"0\">old man</a>.</p>",
		'passageCount': 5,
		'passages': {
			'girl singing': {
				'text': "<p>She is nodding her head to the music in her earphones.</p>",
			},
			'old man': {
				'text': "<p>He is heading towards route 1.</p>",
			},
			'@1': {
				'text': "<p>You&#39;re nearly there.</p>",
			},
			'@2': {
				'text': "<p>You arrived at the flower garden. where you saw <a class=\"squiffy-link link-passage\" data-passage=\"Mrs. Oak reading a book\" role=\"link\" tabindex=\"0\">Mrs. Oak reading a book</a>.</p>",
			},
			'Mrs. Oak reading a book': {
				'text': "<p>She is reading a cooking recipes book.</p>",
			},
			'@3': {
				'text': "<p>You walked ahead and saw <a class=\"squiffy-link link-passage\" data-passage=\"flowers\" role=\"link\" tabindex=\"0\">flowers</a>.</p>",
			},
			'flowers': {
				'text': "<p>You saw beautifull red and white roses. &quot;They are so beautiful&quot; You throught.</p>",
			},
			'@4': {
				'text': "<p>You walked further and saw small heart shaped <a class=\"squiffy-link link-passage\" data-passage=\"fountain\" role=\"link\" tabindex=\"0\">fountain</a>.</p>",
			},
			'fountain': {
				'text': "<p>The fountain lights was off, but it was spouting cold water.</p>",
			},
			'@last': {
				'text': "<p>You&#39;ve explored the flower garden and came out of the flower garden. &quot;That was great&quot;, You looked at your watch and the time is 8:55am. &quot;It&#39;s about time, i should go to the pokemon lab now&quot; You trought while running towards pokemon lab.<br><br>You arrived in front of the lab<br><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Go In The Lab\" role=\"link\" tabindex=\"0\">Go In The Lab</a></u></b></center></p>",
			},
		},
	},
	'Go Towards Route 1': {
		'text': "<p>You decided to head towards route 1, while heading towards route 1 you saw <a class=\"squiffy-link link-passage\" data-passage=\"few pidgey's\" role=\"link\" tabindex=\"0\">few pidgey&#39;s</a>.</p>",
		'passages': {
			'few pidgey\'s': {
				'text': "<p>Few pidgey&#39;s flying towards route 1.</p>",
			},
			'@1': {
				'text': "<p>You heard someone shouting your name from behind. <a class=\"squiffy-link link-passage\" data-passage=\"turn back\" role=\"link\" tabindex=\"0\">turn back</a></p>",
			},
			'turn back': {
				'text': "<p>You turned back and saw your mom shouting your name and you ran towards her. &quot;Mom!, what are you doing here?&quot;, You said exhausted.<br><br>\n&quot;Here, I forgot to give you this&quot;, Mom gived you an gift box.<br><br></p>\n<p><center><b>You recevied an gift from mom.</b></center><br>\n&quot;Why don&#39;t you open it, my dear?&quot;, Mom said.<br><br>\nYou opened the gift and you <a class=\"squiffy-link link-passage\" data-passage=\"saw\" role=\"link\" tabindex=\"0\">saw</a>.</p>",
			},
			'saw': {
				'text': "<p>You saw brand new shoes and new blue hat. &quot;Woah, thank you mom, you&#39;re the best&quot; You replied with smile.<br><br>\n&quot;I&#39;m glad, you liked them&quot;, Mom replied with smile. &quot;You should go to the pokemon lab, it&#39;s almost 9am.&quot;<br><br>\n&quot;Oh yeah, I&#39;ll go now, thanks mom.&quot; You replied, while wearing the blue hat.<br><br>\n<br><br>&quot;Take care, my dear&quot;, Mom replied with smile as she turned back and walked towards your house.\n<br><br>&quot;Bye mom&quot;, You opened your backpack and stored your brand new shoes in it, then you head towards the <a class=\"squiffy-link link-passage\" data-passage=\"pokemon lab\" role=\"link\" tabindex=\"0\">pokemon lab</a></p>",
			},
			'pokemon lab': {
				'text': "<p>You arrived in front of the pokemon lab.</p>\n<p><center><b><u><a class=\"squiffy-link link-section\" data-section=\"Go In The Lab\" role=\"link\" tabindex=\"0\">Go In The Lab</a></u></b></b></p>",
			},
		},
	},
	'Go In The Lab': {
		'text': "",
		'passages': {
			'passage link': {
				'text': "<p>This is the text for the first passage link.</p>",
			},
			'other passage link': {
				'text': "<p>This is the text for the second passage link.</p>",
			},
		},
	},
	'section link': {
		'text': "<p>When a new section appears, any unclicked passage links from the previous section are disabled.</p>",
		'passages': {
		},
	},
}
})();