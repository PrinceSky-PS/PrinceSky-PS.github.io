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
squiffy.story.id = '79814f2e2b';
squiffy.story.sections = {
	'_default': {
		'text': "<p><center><font size=\"6\"><font color=\"green\"><b><u>Pokèmon Adventures</u></b></font></center><br><br>\n<i>Welcome this is the world inhabited not only by humans, but also by the mysterious and wonderful creatures know as Pokèmon. Roaming the land, swimming in the ocean, soaring through the skies, in towns and even in people&#39;s homes, pokèmon can be found everywhere. In most cases people and pokèmon lives together in harmony, helping each other and keeping each other company. Many people travel the world, befriending and capturing the wild pokèmons and battle with them with others, like them in friendly compititons. Those are the pokèmon trainers, be it in groups or alone with their pokèmon, most trainers travel across many regions in the pokèmon world, seeking to improve their skills by challenging pokemon gyms in the towns and the cities they visit, in the aim to participte in the prestigioes Pokèmon Leagues, that each regions hosts.</i>\n<br><br></p>\n<p><center><b><a class=\"squiffy-link link-section\" data-section=\"Play\" role=\"link\" tabindex=\"0\">Play</a></b></center>\n<br></p>",
		'passages': {
		},
	},
	'Play': {
		'text': "<p><b>Pallet Town, Kanto.<br>\n7:30am, 1st April 2017.</b>\n<br><br>\n<i>The magnificent beat down upon <b>pallet town</b> in the south of kanto. Only the few wispy clouds could be seen as the early bird&#39;s among the town&#39;s population started appearing out of their houses. A large flock of tiny bird pokèmon, pidgey, soared overhead in the direction of imposing Mt. Hideway to the west. The town itself was mostly of deep green colour, thanks to abundance of trees and flower gardens. There was a slight chill in the air. However a reminder that it was not yer summer. The peace and quiet of the town was interrupted briefly as a ferry leaving, Pallet&#39;s small port in the south, sounded it&#39;s whistle loudly as it sets at the sea.\n<br><br>\nIn the north western suburbs of town, inside a rectangular pale yellow coloured house, a twovelve year old boy was busily getting ready. He scratched, short brown hair, cut the previous day, as he stared at the clothes, He&#39;d laid down on his bed, he frowned as he attempted to decide, what he should wear, His blue eyes showed his irritation at being unable to make dicision.</i>\n<br><br>\n&quot;James!&quot; <i>You heard your mother calling.</i>\n<br><br>\n&quot;Are you ready for breakfast yet?&quot;\n<br><br>\n&quot;You&#39;re still not dressed yet?&quot; <i>Your younger brother, <b>Tom</b> asked as he poked his head round the door.</i>\n<br><br>\n&quot;No&quot; <i>You replied, shaking your head.</i>\n<br><br>\n&quot;Why don&#39;t you just wear your favorite clothes?&quot; <i>Tom asked.</i>\n<br><br>\n&quot;They&#39;re not really smart enough&quot; <i>You replied with a sigh.</i>\n<br><br>\n&quot;Then how about a shirt and tie?&quot;\n<br><br>\n&quot;That&#39;s a little smart.&quot;\n<br><br>\n&quot;I didn&#39;t think that pokèmon trainers needed to dress smartly&quot; <i><b>Will</b> your middle brother, appeared in the doorway and joined the conversation.</i> &quot;Why don&#39;t you wear the clothes that grandma got you for your birthday?&quot;\n<br><br>\n<i>You thought for a second.</i>\n<br><br></p>\n<p><center><b><a class=\"squiffy-link link-section\" data-section=\"Wear Grandma's Gifted Clothes\" role=\"link\" tabindex=\"0\">Wear Grandma&#39;s Gifted Clothes</a>.\n<br><a class=\"squiffy-link link-section\" data-section=\"Wear Something Else\" role=\"link\" tabindex=\"0\">Wear Something Else</a>.</b></center><br></p>",
		'passages': {
		},
	},
	'Wear Grandma\'s Gifted Clothes': {
		'text': "<p>&quot;Alright&quot; <i>You nodded as you opened <a class=\"squiffy-link link-passage\" data-passage=\"grandma's gifted box\" role=\"link\" tabindex=\"0\">grandma&#39;s gifted box</a>.</i></p>",
		'passages': {
			'grandma\'s gifted box': {
				'text': "<p><i>You took out, yellow T-shirt and pair of dark blue jeans from the gift box.</i>\n<br><br>\n&quot;Do you want a jacket?&quot; <i>Will asked.</i>\n<br><br>\n&quot;It&#39;s still only april&quot; <i>You replied, giving him a look.</i> &quot;Or were you hoping that I&#39;d die from hypothermia?&quot;\n<br><br>\n&quot;How about this one?&quot; <i>Tom picked up an unzipped and slightly faded red jacket.</i> &quot;This is Dad&#39;s old one, so it doesn&#39;t matter if you ruin it&quot;\n<br><br>\n&quot;I won&#39;t ruin it&quot; <i>You snapped, snatching the jacket from his hands.</i> &quot;I&#39;m getting changed now, so both of you leave!&quot;\n<br><br>\n&quot;James!&quot; <i>Your mom called again.</i>\n<br><br>\n&quot;Got it!&quot; <i>You called back as Will and Tom trooped out of the room and went downstairs.</i></p>\n<p><center><b><a class=\"squiffy-link link-passage\" data-passage=\"Change Your Clothes\" role=\"link\" tabindex=\"0\">Change Your Clothes</a></b></center>\n<br></p>",
			},
			'Change Your Clothes': {
				'text': "<p><i>You changed your clothes and went <a class=\"squiffy-link link-section\" data-section=\"Downstairs\" role=\"link\" tabindex=\"0\">Downstairs</a>.</i></p>",
			},
		},
	},
	'Wear Something Else': {
		'text': "<p>&quot;Alright&quot; <i>You nodded, grabbing the mustard dark blue T-shirt and the pair of black jeans from the pile.</i>\n<br><br>\n&quot;Do you need a jacket?&quot; <i>Will asked.</i>\n<br><br>\n&quot;No thanks, It&#39;s still only april&quot; <i>You replied, giving him a smile.</i>\n<br><br>\n&quot;James!&quot; <i>Your mother called again.</i>\n<br><br>\n&quot;Got it&quot; <i>You called back as Will and Tom trooped out of the room and went downstairs.</i>\n<br><br>\n<i>You turned on the <a class=\"squiffy-link link-passage\" data-passage=\"tv\" role=\"link\" tabindex=\"0\">tv</a>.</i></p>",
		'passageCount': 2,
		'passages': {
			'tv': {
				'text': "<center><font color=\"DodgeBlue\"><i><b>Reporter:</b> Welcome back to the gym tv.</i></font></center>",
			},
			'@1': {
				'text': "<p><i>You started to change your <a class=\"squiffy-link link-passage\" data-passage=\"clothes\" role=\"link\" tabindex=\"0\">clothes</a>.</i>\n<br></p>",
			},
			'clothes': {
				'text': "<p><center><font color=\"DodgeBlue\"><i><b>Reporter:</b></font> Few moments ago, we witnessed intense battle between pewter city gym leader <b>Brock</b> and trainer <b>Richard</b>, who is from the sinnoh region. So richard what do you have to say about your victory today?.</i><br><br></p>\n<p><font color=\"tomato\"><i><b>Richard:</b></font> This was the most intense and difficult battle I ever had, He is a very strong gym leader and i respect him.</i>\n<br><br></p>\n<p><font color=\"DodgeBlue\"><i><b>Reporter:</b></font> Thank you richard for talking with us, That&#39;s all for today, see you next week at gym tv.</i></center>\n<br><br>\n&quot;I&#39;ve to train my pokemons hard, to defeat gym leader like brock&quot; <i>You thought, as you turned off the tv.</i></p>",
			},
			'@last': {
				'text': "<p><i>You changed your clothes and went <a class=\"squiffy-link link-section\" data-section=\"Downstairs\" role=\"link\" tabindex=\"0\">Downstairs</a>.</i></p>",
			},
		},
	},
	'Downstairs': {
		'clear': true,
		'text': "<p>&quot;You need to be at the lab before 9&#39;O clock right?&quot; <i>Your mom <b>Hannah</b>, checked with you as you sat down and took a bite of your bacon and egg sandswitch. You quickly swallowed the mouthful.</i>\n<br><br>\n&quot;That&#39;s right&quot;<i> You nodded.</i> &quot;What time it is now?&quot;\n<br><br>\n&quot;Eight&quot; <i>Mom replied.</i> &quot;It&#39;s better to get there early rather than later, so i think you should set off as soon as you finish eating.&quot;\n<br><br>\n&quot;Alright&quot; <i>You replied.</b>\n<br><br>\n&quot;Morning, Everyone&quot; Your dad <b>Peter</b> grinned, as he came into the kitchen.\n<br><br>\n&quot;Morning!&quot; <i>Everyone else called back as you sat down at the dinner table. In your home, the dinning room and kitchen were both in a single, long room which ran from the front of the house to the back. The front third was the kitchen, with doors both to the front hall and outside, while the dinning room made up the remaining two thirds. A line of counters marked the dividing line between the two, which a gap on one side to allow movement between the two sections.</i>\n<br><br>\n&quot;How are you feeling?&quot; <i>Dad asked you.</i>\n<br><br>\n&quot;Nervous&quot; <i>You admitted.</i> &quot;But excited at the same time.&quot;\n<br><br>\n&quot;That&#39;s to be expected!&quot; <i>Dad laughed, patting you on the shoulder.</i> &quot;I look forward to meeting your first pokemon when i get back from work.&quot;\n<br><br>\n&quot;Sure&quot; <i>You nodded, you stood up as you finished your breakfast and took your plate over to the dishwasher.</i> &quot;I&#39;ll be back soon as I&#39;m done at the lab!&quot; <i>You called to mom.</i>\n<br><br>\n&quot;Alright&quot; <i>Mom smiled back at you.</i> &quot;Good Luck!&quot;\n<br><br>\n&quot;Thanks&quot; <i>You grinned back before running out of home.</i>\n<br><br></p>\n<p><center><b><a class=\"squiffy-link link-section\" data-section=\"Roam Around\" role=\"link\" tabindex=\"0\">Roam Around</a><br></b></center><br></p>",
		'passages': {
		},
	},
	'Roam Around': {
		'text': "<p><i>You decided to go at the <a class=\"squiffy-link link-passage\" data-passage=\"flower garden\" role=\"link\" tabindex=\"0\">flower garden</a>.</i><br></p>",
		'passageCount': 7,
		'passages': {
			'flower garden': {
				'text': "<p>&quot;Which pokemon should, I choose as my partner?&quot; <i>You thought.</i><br></p>",
			},
			'@1': {
				'text': "<p><i>You started <a class=\"squiffy-link link-passage\" data-passage=\"walking\" role=\"link\" tabindex=\"0\">walking</a> towards the flower garden.</i><br></p>",
			},
			'walking': {
				'text': "<p>&quot;Maybe, I should choose <font color=\"green\">bulbasaur</font> as my partner, who is a grass type pokemon and it can give me advantage against <b>brock</b>, who is the first gym leader i will face.&quot; <i>You thought, as you walked closer to the flower garden <a class=\"squiffy-link link-passage\" data-passage=\"entrance\" role=\"link\" tabindex=\"0\">entrance</a>.</i><br></p>",
			},
			'entrance': {
				'text': "<p>&quot;Maybe, <font color=\"DodgerBlue\">squirtle</font>, who is a water type pokemon which can also give me advantage against <b>brock</b>, Or should i choose <font color=\"Tomato\">charmander</font>, who is a fire type pokemon which evolves into powerful <font color=\"Tomato\">charizard</font>.&quot; <i>You thought, as you walked <a class=\"squiffy-link link-passage\" data-passage=\"inside\" role=\"link\" tabindex=\"0\">inside</a> the flower garden.</i><br></p>",
			},
			'inside': {
				'text': "<p><i>While exploring the flower garden, you saw an <a class=\"squiffy-link link-passage\" data-passage=\"Woman sitting on a bench\" role=\"link\" tabindex=\"0\">Woman sitting on a bench</a> and <a class=\"squiffy-link link-passage\" data-passage=\"girl singing\" role=\"link\" tabindex=\"0\">girl singing</a> with <a class=\"squiffy-link link-passage\" data-passage=\"water fountain\" role=\"link\" tabindex=\"0\">water fountain</a> at the middle of flower garden.</i><br></p>",
			},
			'Woman sitting on a bench': {
				'text': "<p>She is reading a book.<br></p>",
			},
			'girl singing': {
				'text': "<p>She is nodding her head to the music in her earphones.<br></p>",
			},
			'water fountain': {
				'text': "<p><i>The fountain lights are off and it is spouting cold water.</i><br><br></p>",
			},
			'@last': {
				'text': "<p><i>You explored the flower garden and went to the, <a class=\"squiffy-link link-section\" data-section=\"Pokemon Lab\" role=\"link\" tabindex=\"0\">Pokemon Lab</a>.</i><br></p>",
			},
		},
	},
	'Pokemon Lab': {
		'text': "<p><b> 8:50am, 1st April 2017</b>\n<br><br>\n&quot;Looks like you finally showed up!&quot;\n<br><br>\n<i>Y let out an exasperated sigh as he walked up the steps to the lab entrance.</i> &quot;I&#39;m still just as early as you Dean!&quot; <i>You replied loudly.</i>\n<br><br>\n<i>Dean Adams, a slightly skinnier boy than You, had dark brown eyes and lightish brown hair, cut short like yours&#39;. He iz wearing a black T-shirt and a pair of light grey shorts which reached to just under his knees. He also has a backpack on his back.</i>\n<br><br>\n&quot;I&#39;m surprised you actually showed up in the end!&quot; <i>Dean laughed.</i> &quot;Everyone knows that you&#39;re only getting a pokémon because everyone else is!&quot;\n<br><br>\n&quot;And?&quot; <i>You replied coldly.</i> &quot;Even if I&#39;m only going to be a casual trainer, I&#39;ll still be able to beat you.&quot;\n<br><br>\n<i>You and Dean have known each other since you have first moved to Pallet Town and started school there. once been friends. Rather childishly, however, an intense rivalry has begun between them when both of you developed a crush on the same girl. The rivalry has continued, maybe even intensified, even after the girl has moved away to another region.</i>\n<br><br>\n&quot;I&#39;ll believe it when I see it!&quot; <i>Dean laughed mockingly.</i>\n<br><br>\n<i>Just as you was about to respond, you heard the door open. An ageing man in his fifties with grey hair and a lab coat emerged.</i>\n<br><br>\n&quot;I thought I heard the two of you out here,&quot; he smiled at them. &quot;Come on in, James, Dean,&quot; <i>he gestured to the door behind him.</i>\n<br><br>\n&quot;Thanks, Professor Oak,&quot; <i>You replied, following him in. Professor Oak is one of the leading figures in pokémon research, renowned worldwide. He was popularly known as the &#39;Pokémon Professor&#39;.</i>\n<br><br>\n&quot;So, where are the pokémon?&quot; <i>Dean asked as all of you passed a room full of electrical machines which two of Oak&#39;s assistants were working with.</i>\n<br><br>\n&quot;Just through here,&quot; <i>Oak replied, leaving two of you into a well-lit room at the centre of which stood a small coffee table and two sofas either side of it. Atop the table were three balls. The top halves of these balls were red and the bottom halves were white. At the dividing line between the two halves, there were small buttons.</i> &quot;These are pokéballs,&quot; <i>Oak explained, gently scooping up the first one.</i>\n<br><br>\n&quot;We know what pokéballs are, Professor,&quot; <i>You pointed out to him.</i>\n<br><br>\n&quot;Yeah.&quot; <i>Dean nodded.</i> &quot;They&#39;re used to catch and store pokémon. One of the starter pokémon is in that one, right?&quot;\n<br><br>\n&quot;That&#39;s right.&quot; <i>Oak nodded.</i> &quot;This one is the grass type pokémon, <font color=\"green\">bulbasaur</font>.&quot; <i>He clicked the button on the front of the pokéball and it popped open. A glowing lump of energy shining a bright blue colour burst out of the ball. It reshaped itself as it reached the floor. There was a burst of sparks and a small, four-legged pokémon with a bluish green body, red eyes and a large green bulb on its back appeared.</i>\n<br><br>\n &quot;This next one is <font color=\"Tomato\">charmander</font>, the fire type pokémon.&quot; <i>Oak continued, picking up the next pokéball.</i> &quot;You should be a little more cautious with this one,&quot;<i> he added as the ball of energy burst out of the pokéball and reshaped itself.</i>\n<br><br>\n&quot;Chaaaar?&quot;<i> <font color=\"Tomato\">Charmander</font>, an orange biped lizard with a rounded head and a flame on the tip of its tail, also looked around before standing to attention.</i>\n<br><br>\n&quot;This one&#39;s really awesome as well!&quot; <i>You sighed.</i> &quot;I don&#39;t know which to pick!&quot;\n<br><br>\n&quot;Why don&#39;t you wait until after you&#39;ve seen the third pokémon before making the decision?&quot; <i>Dean asked, shaking his head.</i> &quot;I worry about you sometimes, James,&quot; <i>he added with a fake pitying look.</i>\n<br><br>\n&quot;Hey! At least I&#39;m expressing an interest!&quot; <i>You snapped in response.</i>\n<br><br>\n<i>The <font color=\"green\">bulbasaur</font> and <font color=\"Tomato\">charmander</font> shared a worried look as Oak released the third pokémon.</i> &quot;This one is the water pokémon, <font color=\"DodgerBlue\">squirtle</font>,&quot;<i> he explained as a small biped turtle with a light blue body and a brown shell appeared.</i> &quot;So, which one will each of you choose as your first partner?&quot;\n<br><br>\n<i>You and Dean both looked intently between the three pokémon. Dean spoke first.</i>\n<br><br>\n&quot;I choose the <font color=\"dodgerblue\">squirtle</font> as my starter,&quot;<i> he said to Oak.</i>\n<br><br>\n&quot;A fine choice,&quot;<i> Oak replied, handing him the squirtle&#39;s pokéball.</i{ \"Make sure to take good care of him.\"\n<br><br>\n&quot;I will.&quot; <i>Dean nodded.</i> &quot;Thanks, Professor.&quot;\n<br><br>\n&quot;How about you, James?&quot; <i>Oak asked you.</i>\n<br><br>\n&quot;I think I&#39;ve decided,&quot; <i>You replied.</i>\n<br><br></p>\n<p><center><b> <a class=\"squiffy-link link-section\" data-section=\"Charmander\" role=\"link\" tabindex=\"0\">Charmander</a> || <a class=\"squiffy-link link-section\" data-section=\"Bulbasaur\" role=\"link\" tabindex=\"0\">Bulbasaur</a></b></center>\n<br></p>",
		'passages': {
		},
	},
	'Charmander': {
		'text': "<p><i>You walked over and patted <font color=\"Tomato\">charmander</font> on his head.</i> &quot;I&#39;ll choose you <font color=\"Tomato\">charmander</font>.&quot;<br></p>",
		'passages': {
		},
	},
	'Bulbasaur': {
		'text': "<p><i>You walked over and patted <font color=\"green\">bulbasaur</font> on her head.</i> &quot;I&#39;ll choose you <font color=\"green\">bulbasaur</font>.&quot;<br></p>",
		'passages': {
		},
	},
}
})();