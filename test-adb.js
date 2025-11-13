// Test script to verify ADB functionality
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function testADB() {
    console.log('Testing ADB functionality...');
    
    try {
        // Test 1: Check if ADB is available
        console.log('\n1. Testing ADB availability...');
        const { stdout: adbVersion } = await execPromise('adb version');
        console.log('✓ ADB is available:', adbVersion.trim());
        
        // Test 2: Check for connected devices
        console.log('\n2. Testing device detection...');
        const { stdout: devicesOutput } = await execPromise('adb devices');
        console.log('Raw devices output:');
        console.log(devicesOutput);
        
        // Parse devices - fixed logic
        const lines = devicesOutput.split('\n').filter(line => line.trim() && !line.includes('List of devices') && line.includes('device'));
        const devices = [];
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const deviceId = parts[0];
            const status = parts[1];
            
            if (deviceId && status === 'device') {
                console.log(`Found device: ${deviceId} (${status})`);
                
                // Try to get device info
                try {
                    const { stdout: model } = await execPromise(`adb -s ${deviceId} shell getprop ro.product.model`);
                    const { stdout: manufacturer } = await execPromise(`adb -s ${deviceId} shell getprop ro.product.manufacturer`);
                    console.log(`Device info: ${manufacturer.trim()} ${model.trim()}`);
                    
                    devices.push({
                        id: deviceId,
                        model: model.trim(),
                        manufacturer: manufacturer.trim()
                    });
                } catch (infoError) {
                    console.log(`Could not get device info for ${deviceId}`);
                    devices.push({
                        id: deviceId,
                        model: 'Unknown',
                        manufacturer: 'Unknown'
                    });
                }
            }
        }
        
        if (devices.length === 0) {
            console.log('No Android devices found. Make sure:');
            console.log('- USB debugging is enabled on your device');
            console.log('- Device is connected via USB');
            console.log('- ADB drivers are installed');
        } else {
            console.log(`\n✓ Found ${devices.length} device(s)`);
        }
        
        // Test 3: Test target directory creation
        if (devices.length > 0) {
            console.log('\n3. Testing target directory access...');
            const testDevice = devices[0].id;
            const targetDir = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
            
            try {
                await execPromise(`adb -s ${testDevice} shell mkdir -p "${targetDir}"`);
                console.log(`✓ Successfully created/accessed directory: ${targetDir}`);
                
                // Test listing directory contents
                const { stdout: lsOutput } = await execPromise(`adb -s ${testDevice} shell ls -la "${targetDir}"`);
                console.log('Directory contents:');
                console.log(lsOutput);
            } catch (dirError) {
                console.log(`✗ Failed to access directory: ${dirError.message}`);
            }
        }
        
    } catch (error) {
        console.error('✗ ADB test failed:', error.message);
        console.log('\nTroubleshooting steps:');
        console.log('1. Make sure ADB is installed and in PATH');
        console.log('2. Install Android SDK Platform Tools');
        console.log('3. Enable USB debugging on your Android device');
        console.log('4. Install proper USB drivers for your device');
    }
}

// Run the test
testADB().catch(console.error);