// scripts/verifyEndpoints.js
const fs = require('fs');
const path = require('path');

/**
 * Script para verificar que todos los endpoints consolidados estén implementados
 */
const verifyEndpoints = () => {
  console.log('🔍 Verificando endpoints consolidados...\n');

  const apiDir = path.join(__dirname, '../api');
  const expectedEndpoints = [
    'userProfile.js',
    'adminDashboard.js', 
    'documentReview.js',
    'documentsBatchUpdate.js'
  ];

  const missingEndpoints = [];
  const existingEndpoints = [];

  // Verificar archivos de endpoints
  expectedEndpoints.forEach(endpoint => {
    const filePath = path.join(apiDir, endpoint);
    if (fs.existsSync(filePath)) {
      existingEndpoints.push(endpoint);
      console.log(`✅ ${endpoint} - Implementado`);
    } else {
      missingEndpoints.push(endpoint);
      console.log(`❌ ${endpoint} - FALTANTE`);
    }
  });

  console.log('\n📊 Resumen:');
  console.log(`✅ Endpoints implementados: ${existingEndpoints.length}/${expectedEndpoints.length}`);
  console.log(`❌ Endpoints faltantes: ${missingEndpoints.length}`);

  if (missingEndpoints.length > 0) {
    console.log('\n🚨 Endpoints faltantes:');
    missingEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
  }

  // Verificar registro en index.js
  console.log('\n🔍 Verificando registro en index.js...');
  const indexPath = path.join(apiDir, 'index.js');
  
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    const expectedRoutes = [
      '/api/v1/user-profile/',
      '/api/v1/admin-dashboard',
      '/api/v1/document-review/',
      '/api/v1/documents/batch-update'
    ];

    expectedRoutes.forEach(route => {
      if (indexContent.includes(route)) {
        console.log(`✅ Ruta registrada: ${route}`);
      } else {
        console.log(`❌ Ruta NO registrada: ${route}`);
      }
    });
  } else {
    console.log('❌ index.js no encontrado');
  }

  // Verificar configuración de Google
  console.log('\n🔍 Verificando configuración de Google...');
  const googleConfigPath = path.join(__dirname, '../config/google.js');
  
  if (fs.existsSync(googleConfigPath)) {
    console.log('✅ Configuración de Google encontrada');
    
    // Verificar variables de entorno requeridas
    const requiredEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_SHEETS_ID',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY'
    ];

    console.log('\n📋 Variables de entorno requeridas:');
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} - Configurada`);
      } else {
        console.log(`❌ ${envVar} - NO configurada`);
      }
    });
  } else {
    console.log('❌ Configuración de Google no encontrada');
  }

  // Verificar servicios del frontend
  console.log('\n🔍 Verificando servicios del frontend...');
  const frontendServicesDir = path.join(__dirname, '../../fsalud/src/services');
  
  if (fs.existsSync(frontendServicesDir)) {
    const expectedServices = [
      'docsService.js',
      'userProfileService.js',
      'adminDashboardService.js'
    ];

    expectedServices.forEach(service => {
      const servicePath = path.join(frontendServicesDir, service);
      if (fs.existsSync(servicePath)) {
        console.log(`✅ Servicio frontend: ${service}`);
      } else {
        console.log(`❌ Servicio frontend faltante: ${service}`);
      }
    });
  } else {
    console.log('❌ Directorio de servicios frontend no encontrado');
  }

  console.log('\n🎯 Verificación completada!');
};

// Ejecutar verificación
verifyEndpoints(); 