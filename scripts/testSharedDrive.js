// scripts/testSharedDrive.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
require('dotenv').config();

/**
 * Script para probar la configuración del Shared Drive
 */
const testSharedDrive = async () => {
  console.log('🧪 Probando configuración del Shared Drive...\n');

  try {
    // Verificar configuración
    console.log('📋 Configuración actual:');
    console.log(`GOOGLE_SHARED_DRIVE_ID: ${process.env.GOOGLE_SHARED_DRIVE_ID || 'NO CONFIGURADO'}`);
    console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NO CONFIGURADO'}\n`);

    if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
      console.error('❌ ERROR: GOOGLE_SHARED_DRIVE_ID no está configurado');
      console.log('💡 Solución: Configura la variable de entorno GOOGLE_SHARED_DRIVE_ID');
      return;
    }

    if (!jwtClient) {
      console.error('❌ ERROR: No se pudo inicializar el cliente JWT');
      return;
    }

    // Crear cliente de Drive
    const drive = google.drive({ version: 'v3', auth: jwtClient });

    // Verificar acceso al Shared Drive
    console.log('🔍 Verificando acceso al Shared Drive...');
    
    try {
      const driveInfo = await drive.drives.get({
        driveId: process.env.GOOGLE_SHARED_DRIVE_ID,
        fields: 'id, name, capabilities',
      });
      
      console.log(`✅ Shared Drive accesible: ${driveInfo.data.name}`);
      console.log(`   ID: ${driveInfo.data.id}`);
      console.log(`   Capacidades: ${JSON.stringify(driveInfo.data.capabilities)}`);
      
      // Verificar si podemos crear archivos
      if (driveInfo.data.capabilities?.canAddChildren) {
        console.log('✅ Permisos de escritura confirmados');
      } else {
        console.log('⚠️ El Service Account no tiene permisos de escritura');
      }
      
    } catch (error) {
      console.error('❌ Error al acceder al Shared Drive:', error.message);
      console.log('💡 Solución: Verifica que el Service Account sea miembro del Shared Drive');
      return;
    }

    // Probar subida de archivo de prueba
    console.log('\n🧪 Probando subida de archivo...');
    
    try {
      const testBuffer = Buffer.from('Test file content');
      const testFileName = `test-${Date.now()}.txt`;
      
      // Metadata del archivo de prueba
      const fileMetadata = {
        name: testFileName,
        parents: [process.env.GOOGLE_SHARED_DRIVE_ID],
      };
      
      const media = {
        mimeType: 'text/plain',
        body: require('stream').Readable.from(testBuffer),
      };
      
      const createOptions = {
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true,
        supportsTeamDrives: true,
      };
      
      const response = await drive.files.create(createOptions);
      
      console.log('✅ Archivo de prueba subido exitosamente');
      console.log(`   ID: ${response.data.id}`);
      console.log(`   Nombre: ${response.data.name}`);
      console.log(`   Link: ${response.data.webViewLink}`);
      
      // Limpiar archivo de prueba
      await drive.files.delete({ 
        fileId: response.data.id,
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });
      console.log('🧹 Archivo de prueba eliminado');
      
      console.log('\n🎉 ¡Configuración del Shared Drive exitosa!');
      console.log('💡 Ahora puedes subir archivos sin problemas de cuota.');
      
    } catch (error) {
      console.error('❌ Error al subir archivo de prueba:', error.message);
      
      if (error.message.includes('Service Accounts do not have storage quota')) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO:');
        console.log('   Las Service Accounts no tienen cuota de almacenamiento en Drive personal');
        console.log('   SOLUCIÓN: Usar Shared Drives');
        console.log('\n📋 Pasos para solucionar:');
        console.log('   1. Crear un Shared Drive en Google Drive');
        console.log('   2. Agregar el Service Account como miembro');
        console.log('   3. Configurar GOOGLE_SHARED_DRIVE_ID en las variables de entorno');
        console.log('   4. Reiniciar la aplicación');
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
};

// Ejecutar prueba
testSharedDrive(); 