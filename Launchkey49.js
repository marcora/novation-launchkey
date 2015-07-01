/*
Track < : 102 ** always from Midi 1 **
Track > : 103 ** always from Midi 1 **
Faders 1-8 : 41-48  ** from Midi 0 or 1 **
Fader 9 : 7  ** from Midi 0 or 1 **
Button 1-8 : 51-58  ** from Midi 0 or 1 **
Button 9 : 59  ** from Midi 0 or 1 **
InControl Knobs Button : 13 [toggle] ** always from Midi 1 **
InControl Faders Button : 14 [toggle] ** always from Midi 1 **
InControl Pads Button : 15 [toggle] ** always from Midi 1 **
Knobs 1-8 : 21-28  ** from Midi 0 or 1 **
Pads 1-8 + Round Button: note on/off 144/128 [96-103 + 104] ** from Midi 1, 104 from Midi 0 **
Pads 9-16+ Round Button: note on/off 144/128 [112-119 + 120] ** from Midi 1, 105 from Midi 0 **
<< Button : 112 ** always from Midi 1 **
>> Button : 113 ** always from Midi 1 **
Stop Button : 114 ** always from Midi 1 **
Play Button : 115 ** always from Midi 1 **
Loop Button : 116 ** always from Midi 1 **
Record Button : 117 ** always from Midi 1 **
*/
var selectedPage = -1;
var pageName = "";
var pageNames = [];
var pageCount = 0;

var selectedPreset = -1;
var presetName = "";
var presetNames = [];
var presetCount = 0;

var firstPreset = true;
var lastPreset = true;
var showPreset = false;

var userControls = [];

var ledstate = initArray(-1, 18);
var pendingLedstate = initArray(0, 18);

var fastblink = false;
var blink = false;

var incontrol_mix = true;
var incontrol_knobs = true;
var incontrol_pads = true;

function mixColour(red, green, blink) {
	return (blink ? 8 : 12) | red | (green * 16);
}

function updateOutputState() {

	for (var i = 0; i < 8; i++) {
		if (selectedPage == -1 || pageCount == 0) {
			pendingLedstate[i] = 0;
		} else {
			pendingLedstate[i] = (selectedPage == i) ? mixColour(2, 0, false) : (i < pageCount) ? mixColour(2, 2, false) : 0;
		}

		var j = i + 9;
		var k = i + 8;

		if (selectedPage == -1 || pageCount == 0) {
			pendingLedstate[j] = 0;
		} else {
			pendingLedstate[j] = (selectedPage == k) ? mixColour(2, 0, false) : (k < pageCount) ? mixColour(2, 2, false) : 0;
		}
	}

	if (firstPreset) {
		pendingLedstate[8] = 0;
	} else {
		pendingLedstate[8] = mixColour(0, 2, false);
	}

	if (lastPreset) {
		pendingLedstate[17] = 0;
	} else {
		pendingLedstate[17] = mixColour(0, 2, false);
	}
}

function flushOutputState() {
	for (var i = 0; i < 9; i++) {
		if (pendingLedstate[i] != ledstate[i]) {
			ledstate[i] = pendingLedstate[i];
			host.getMidiOutPort(1).sendMidi(0x90, 96 + i, ledstate[i]);
		}

		var j = i + 9;
		if (pendingLedstate[j] != ledstate[j]) {
			ledstate[j] = pendingLedstate[j];
			host.getMidiOutPort(1).sendMidi(0x90, 112 + i, ledstate[j]);
		}
	}
}

function init() {
	host.getMidiInPort(0).createNoteInput("Launchkey Keys", "80????", "90????", "B001??", "D0????", "E0????");
	host.getMidiInPort(0).createNoteInput("Launchkey Pads", "89????", "99????");

	host.getMidiInPort(0).setMidiCallback(onMidi0);
	host.getMidiInPort(1).setMidiCallback(onMidi1);

	transport = host.createTransport();

	masterTrack = host.createMasterTrack(0);
	cursorTrack = host.createCursorTrack(0, 8);

	primaryDevice = cursorTrack.getPrimaryDevice();

	primaryDevice.addSelectedPageObserver(-1, function(value) {
		selectedPage = value;
	});

	primaryDevice.addPageNamesObserver(function() {
		pageCount = arguments.length;
		pageNames = arguments;
	});

	primaryDevice.addPresetNameObserver(255, "", function(value) {
		presetName = value;
	});

	primaryDevice.addPresetNamesObserver(function() {
		presetCount = arguments.length;
		presetNames = arguments;

		selectedPreset = -1;

		for (var i = 0; i < presetCount; i++) {
			if (presetName == presetNames[i]) {
				selectedPreset = i;
				break;
			}
		}
		if (presetCount > 0) {
			if (selectedPreset != -1) {
				firstPreset = (selectedPreset == 0);
				lastPreset = (selectedPreset == (presetCount - 1));
				if (showPreset && presetName) {
					host.showPopupNotification("Preset: " + presetName);
					showPreset = false;
				}
			} else {
				firstPreset = true;
				lastPreset = false;
			}
		} else {
			firstPreset = true;
			lastPreset = true;
		}
	});

	userControls = host.createUserControls(8);

	for (var p = 0; p < 8; p++) {
		userControls.getControl(p).setLabel("User Control " + (p + 1));
	}

	host.getMidiOutPort(0).sendMidi(0x90, 0x0C, 0x7F);
	host.getMidiOutPort(1).sendMidi(0x90, 0x0C, 0x7F);

	updateIndications();

	host.scheduleTask(blinkTimer, null, 100);
}

function blinkTimer() {
	fastblink = !fastblink;

	if (fastblink) {
		blink = !blink;
	}

	host.scheduleTask(blinkTimer, null, 100);
}

function updateIndications() {
	for (var i = 0; i < 8; i++) {
		primaryDevice.getParameter(i).setIndication(incontrol_knobs);
		userControls.getControl(i).setIndication(!incontrol_knobs);
		primaryDevice.getEnvelopeParameter(i).setIndication(incontrol_mix);
		primaryDevice.getMacro(i).getAmount().setIndication(!incontrol_mix);
	}
}

function exit() {
	host.getMidiOutPort(0).sendMidi(0x90, 0x0C, 0x00);
	host.getMidiOutPort(1).sendMidi(0x90, 0x0C, 0x00);
}

function flush() {
	updateOutputState();
	flushOutputState();
}

function onMidi0(status, data1, data2) {
	if (isChannelController(status)) {
		if (data1 >= 21 && data1 <= 28) // knobs 1-8
		{
			var knobIndex = data1 - 21;

			userControls.getControl(knobIndex).set(data2, 128);
		} else if (data1 >= 41 && data1 <= 48) // faders 1-8
		{
			var sliderIndex = data1 - 41;

			primaryDevice.getMacro(sliderIndex).getAmount().set(data2, 128);
		} else if (data1 == 7) // fader 9/master
		{
			cursorTrack.getVolume().set(data2, 128);
		} else if (data1 >= 51 && data1 <= 58) // buttons 1-8
		{
			var buttonIndex = data1 - 51;

			if (data2 == 127) {
				// TODO: ?
			}
		} else if (data1 == 59) // button 9/master
		{
			var buttonIndex = data1 - 51;

			if (data2 == 127) {
				cursorTrack.getSolo().toggle(true);
			}
		}

		if (data2 == 127) {
			// button presses
			if (data1 == 104) {
				primaryDevice.switchToPreviousPreset();
				showPreset = true;
			} else if (data1 == 105) {
				primaryDevice.switchToNextPreset();
				showPreset = true;
			}
		}
	}
}


function onMidi1(status, data1, data2) {
	if (isChannelController(status)) {
		if (data1 >= 21 && data1 <= 28) // knobs 1-8
		{
			var knobIndex = data1 - 21;

			primaryDevice.getParameter(knobIndex).set(data2, 128);



		} else if (data1 >= 41 && data1 <= 48) // faders 1-8
		{
			var sliderIndex = data1 - 41;

			primaryDevice.getEnvelopeParameter(sliderIndex).set(data2, 128);
		} else if (data1 == 7) // fader 9/master
		{
			primaryDevice.getEnvelopeParameter(8).set(data2, 128);
		} else if (data1 >= 51 && data1 <= 58) // buttons 1-8
		{
			var buttonIndex = data1 - 51;

			if (data2 == 127) {
				primaryDevice.getModulationSource(buttonIndex).toggleIsMapping();
			}
		} else if (data1 == 59) // button 9/master
		{
			var buttonIndex = data1 - 51;

			if (data2 == 127) {
				primaryDevice.isWindowOpen().toggle();
			}
		}

		if (data2 == 127) {
			// button presses
			if (data1 == 102) {
				cursorTrack.selectPrevious();
			} else if (data1 == 103) {
				cursorTrack.selectNext();
			} else if (data1 == 112) {
				transport.rewind();
			} else if (data1 == 113) {
				transport.fastForward();
			} else if (data1 == 114) {
				transport.stop();
			} else if (data1 == 115) {
				transport.play();
			} else if (data1 == 116) {
				transport.toggleLoop();
			} else if (data1 == 117) {
				transport.record();
			}
		}
	}

	if (MIDIChannel(status) == 0 && isNoteOn(status)) {
		if (data1 >= 96 && data1 < 104) {
			var i = data1 - 96;

			if (i < pageCount) {
				primaryDevice.setParameterPage(i);
				host.showPopupNotification("Parameter Page: " + pageNames[i]);
			}
		} else if (data1 >= 112 && data1 < 120) {
			var i = (data1 - 112);
			var k = i + 8;

			if (k < pageCount) {
				primaryDevice.setParameterPage(k);
				host.showPopupNotification("Parameter Page: " + pageNames[k]);
			}
		} else if (data1 == 104) {
			primaryDevice.switchToPreviousPreset();
			showPreset = true;
		} else if (data1 == 120) {
			primaryDevice.switchToNextPreset();
			showPreset = true;
		}

		if (data1 == 13) {
			incontrol_knobs = data2 == 127;
			host.showPopupNotification(incontrol_knobs ? "Knobs: Parameters" : "Knobs: User Controls");
			updateIndications();
		} else if (data1 == 14) {
			incontrol_mix = data2 == 127;
			host.showPopupNotification(incontrol_mix ? "Sliders: Envelopes" : "Sliders: Macros");
			updateIndications();
		} else if (data1 == 15) {
			incontrol_pads = data2 == 127;
			host.showPopupNotification(incontrol_pads ? "Pads: Parameter Pages" : "Pads: Trigger Pads");
			updateIndications();
		}
	}
}