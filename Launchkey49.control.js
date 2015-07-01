loadAPI(1);

host.defineController("Novation", "Launchkey 49 (Updated)", "1.0", "40635400-6cfb-11e4-9803-0800200c9a66");
host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 49 Launchkey MIDI", "Launchkey 49 Launchkey InControl"], ["Launchkey 49 Launchkey MIDI", "Launchkey 49 Launchkey InControl"]);

load('Launchkey49.js')