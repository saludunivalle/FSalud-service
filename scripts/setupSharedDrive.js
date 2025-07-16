// scripts/setupSharedDrive.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
require('dotenv').config();

/**
 * Script para configurar y verificar Shared Drives
 */
const setupSharedDrive = async () => {
  console.log('🔧 Configurando Shared Drive para Google Drive...\n');

  try {
    // Verificar configuración actual
    console.log('📋 Configuración actual:');
    console.log(`GOOGLE_SHARED_DRIVE_ID: ${process.env.GOOGLE_SHARED_DRIVE_ID || 'NO CONFIGURADO'}`);
    console.log(`GOOGLE_DRIVE_FOLDER_ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'NO CONFIGURADO'}`);
    console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NO CONFIGURADO'}\n`);

    // Verificar que tenemos las credenciales necesarias
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.error('❌ ERROR: GOOGLE_SERVICE_ACCOUNT_EMAIL no está configurado');
      console.log('💡 Solución: Configura la variable de entorno GOOGLE_SERVICE_ACCOUNT_EMAIL');
      return;
    }

    if (!jwtClient) {
      console.error('❌ ERROR: No se pudo inicializar el cliente JWT');
      console.log('💡 Solución: Verifica las credenciales de Google Service Account');
      return;
    }

    // Crear cliente de Drive
    const drive = google.drive({ version: 'v3', auth: jwtClient });

    // Listar Shared Drives disponibles
    console.log('🔍 Buscando Shared Drives disponibles...');
    
    try {
      const drivesResponse = await drive.drives.list({
        pageSize: 10,
        fields: 'drives(id, name, capabilities)',
      });

      if (drivesResponse.data.drives && drivesResponse.data.drives.length > 0) {
        console.log('✅ Shared Drives encontrados:');
        drivesResponse.data.drives.forEach((drive, index) => {
          console.log(`  ${index + 1}. ${drive.name} (ID: ${drive.id})`);
          console.log(`     Capacidades: ${JSON.stringify(drive.capabilities)}`);
        });

        // Si no hay GOOGLE_SHARED_DRIVE_ID configurado, sugerir usar el primero
        if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
          const firstDrive = drivesResponse.data.drives[0];
          console.log(`\n💡 SUGERENCIA: Usar el primer Shared Drive`);
          console.log(`   Agrega esta variable de entorno:`);
          console.log(`   GOOGLE_SHARED_DRIVE_ID=${firstDrive.id}`);
        }
      } else {
        console.log('⚠️ No se encontraron Shared Drives');
        console.log('💡 Para crear un Shared Drive:');
        console.log('   1. Ve a https://drive.google.com');
        console.log('   2. Haz clic en "Nuevo" > "Carpeta compartida"');
        console.log('   3. Dale un nombre (ej: "FSalud Documentos")');
        console.log('   4. Compártelo con tu Service Account');
        console.log('   5. Copia el ID del Shared Drive');
      }
    } catch (error) {
      console.error('❌ Error al listar Shared Drives:', error.message);
      
      if (error.message.includes('403')) {
        console.log('💡 El Service Account no tiene permisos para listar Shared Drives');
        console.log('   Solución: Agrega el Service Account como miembro del Shared Drive');
      }
    }

    // Si hay un Shared Drive configurado, verificar permisos
    if (process.env.GOOGLE_SHARED_DRIVE_ID) {
      console.log('\n🔍 Verificando permisos en Shared Drive...');
      
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
      }
    }

    // Probar subida de archivo de prueba
    console.log('\n🧪 Probando subida de archivo...');
    
    try {
      const testBuffer = Buffer.from('Test file content');
      const testFileName = `test-${Date.now()}.txt`;
      
      // Metadata del archivo de prueba
      const fileMetadata = {
        name: testFileName,
        parents: [process.env.GOOGLE_SHARED_DRIVE_ID || process.env.GOOGLE_DRIVE_FOLDER_ID],
      };
      
      const media = {
        mimeType: 'text/plain',
        body: require('stream').Readable.from(testBuffer),
      };
      
      const createOptions = {
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      };
      
      // Si estamos usando Shared Drive, agregar los parámetros
      if (process.env.GOOGLE_SHARED_DRIVE_ID) {
        createOptions.supportsAllDrives = true;
        createOptions.supportsTeamDrives = true;
      }
      
      const response = await drive.files.create(createOptions);
      
      console.log('✅ Archivo de prueba subido exitosamente');
      console.log(`   ID: ${response.data.id}`);
      console.log(`   Nombre: ${response.data.name}`);
      console.log(`   Link: ${response.data.webViewLink}`);
      
      // Limpiar archivo de prueba
      await drive.files.delete({ fileId: response.data.id });
      console.log('🧹 Archivo de prueba eliminado');
      
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

    console.log('\n🎯 Configuración completada!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
};

// Ejecutar configuración
setupSharedDrive();