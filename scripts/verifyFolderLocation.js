// scripts/verifyFolderLocation.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
require('dotenv').config();

/**
 * Script para verificar que la carpeta base esté en el Shared Drive
 */
const verifyFolderLocation = async () => {
  console.log('🔍 Verificando ubicación de la carpeta base...\n');

  try {
    // Verificar configuración
    console.log('📋 Configuración actual:');
    console.log(`GOOGLE_SHARED_DRIVE_ID: ${process.env.GOOGLE_SHARED_DRIVE_ID || 'NO CONFIGURADO'}`);
    console.log(`GOOGLE_DRIVE_FOLDER_ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'NO CONFIGURADO'}\n`);

    if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
      console.error('❌ ERROR: GOOGLE_SHARED_DRIVE_ID no está configurado');
      return;
    }

    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.error('❌ ERROR: GOOGLE_DRIVE_FOLDER_ID no está configurado');
      return;
    }

    if (!jwtClient) {
      console.error('❌ ERROR: No se pudo inicializar el cliente JWT');
      return;
    }

    // Crear cliente de Drive
    const drive = google.drive({ version: 'v3', auth: jwtClient });

    // Verificar que la carpeta base existe y obtener su información
    console.log('🔍 Verificando carpeta base...');
    
    try {
      const folderInfo = await drive.files.get({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        fields: 'id, name, parents, driveId',
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });
      
      console.log(`✅ Carpeta base encontrada: ${folderInfo.data.name}`);
      console.log(`   ID: ${folderInfo.data.id}`);
      console.log(`   Drive ID: ${folderInfo.data.driveId || 'Mi unidad'}`);
      console.log(`   Parents: ${folderInfo.data.parents?.join(', ') || 'Raíz'}`);
      
      // Verificar si está en el Shared Drive
      if (folderInfo.data.driveId === process.env.GOOGLE_SHARED_DRIVE_ID) {
        console.log('✅ La carpeta base está en el Shared Drive correcto');
      } else if (folderInfo.data.driveId) {
        console.log('❌ La carpeta base está en un Shared Drive diferente');
        console.log(`   Esperado: ${process.env.GOOGLE_SHARED_DRIVE_ID}`);
        console.log(`   Actual: ${folderInfo.data.driveId}`);
      } else {
        console.log('❌ La carpeta base está en "Mi unidad" (Drive personal)');
        console.log('💡 SOLUCIÓN: Crea la carpeta base dentro del Shared Drive');
      }
      
    } catch (error) {
      console.error('❌ Error al verificar carpeta base:', error.message);
      return;
    }

    // Verificar acceso al Shared Drive
    console.log('\n🔍 Verificando acceso al Shared Drive...');
    
    try {
      const driveInfo = await drive.drives.get({
        driveId: process.env.GOOGLE_SHARED_DRIVE_ID,
        fields: 'id, name, capabilities',
      });
      
      console.log(`✅ Shared Drive accesible: ${driveInfo.data.name}`);
      console.log(`   ID: ${driveInfo.data.id}`);
      
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

    console.log('\n🎯 Verificación completada!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
};

// Ejecutar verificación
verifyFolderLocation(); 