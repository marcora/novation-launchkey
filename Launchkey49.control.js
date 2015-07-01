loadAPI(1);

host.defineController("Novation", "Launchkey 49", "1.0", "4e82aa1b-78fd-488b-8a73-8d7ebdf4fc77");
host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 49 Launchkey MIDI", "Launchkey 49 Launchkey InControl"], ["Launchkey 49 Launchkey MIDI", "Launchkey 49 Launchkey InControl"]);

load('Launchkey49.js')
