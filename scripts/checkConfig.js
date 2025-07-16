// scripts/checkConfig.js
require('dotenv').config();

console.log('🔧 Verificando configuración del sistema...\n');

// Verificar variables de entorno críticas
const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'JWT_SECRET',
  'GOOGLE_DRIVE_FOLDER_ID'
];

const optionalVars = [
  'GOOGLE_SHARED_DRIVE_ID',
  'GOOGLE_SHEETS_ID',
  'GMAIL_USER',
  'GMAIL_REFRESH_TOKEN'
];

console.log('📋 Variables de entorno requeridas:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
  }
});

console.log('\n📋 Variables de entorno opcionales:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`⚠️ ${varName}: NO CONFIGURADA (opcional)`);
  }
});

// Verificar configuración específica para Shared Drive
console.log('\n🚨 PROBLEMA IDENTIFICADO:');
if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
  console.log('   ❌ GOOGLE_SHARED_DRIVE_ID no está configurada');
  console.log('   💡 Esto causará el error "Service Accounts do not have storage quota"');
  console.log('\n📋 SOLUCIÓN:');
  console.log('   1. Crear un Shared Drive en Google Drive');
  console.log('   2. Obtener el ID del Shared Drive de la URL');
  console.log('   3. Agregar GOOGLE_SHARED_DRIVE_ID=tu_id_aqui al archivo .env');
  console.log('   4. Agregar el Service Account como miembro del Shared Drive');
} else {
  console.log('   ✅ GOOGLE_SHARED_DRIVE_ID está configurada');
}

// Verificar configuración de CORS
console.log('\n🌐 Configuración de CORS:');
console.log(`   Puerto del servidor: ${process.env.PORT || 3001}`);
console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);

console.log('\n🎯 Configuración completada!'); 