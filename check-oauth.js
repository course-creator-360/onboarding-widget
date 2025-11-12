#!/usr/bin/env node

/**
 * Quick script to check if agency OAuth is set up in the database
 * Run: node check-oauth.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOAuth() {
  console.log('\n🔍 Checking Agency OAuth Status...\n');
  
  try {
    // Check for agency installations
    const agencyInstallations = await prisma.installation.findMany({
      where: { tokenType: 'agency' }
    });
    
    console.log(`Found ${agencyInstallations.length} agency installation(s)\n`);
    
    if (agencyInstallations.length === 0) {
      console.log('❌ NO AGENCY OAUTH FOUND');
      console.log('\nTo set up agency OAuth:');
      console.log('1. Start your server (npm run dev)');
      console.log('2. Open http://localhost:4002');
      console.log('3. Click "🔑 Setup Agency OAuth"');
      console.log('4. Complete the OAuth flow in GoHighLevel\n');
    } else {
      agencyInstallations.forEach((install, index) => {
        console.log(`\n✅ Agency Installation ${index + 1}:`);
        console.log(`   Location ID: ${install.locationId}`);
        console.log(`   Account ID: ${install.accountId || 'N/A'}`);
        console.log(`   Has Access Token: ${install.accessToken ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   Has Refresh Token: ${install.refreshToken ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   Expires At: ${install.expiresAt ? new Date(Number(install.expiresAt)).toLocaleString() : 'N/A'}`);
        console.log(`   Created: ${install.createdAt.toLocaleString()}`);
        console.log(`   Updated: ${install.updatedAt.toLocaleString()}`);
      });
      
      console.log('\n✅ Agency OAuth is configured!');
      console.log('\nYour preview widget should now work.');
    }
    
    // Check for sub-accounts
    const subAccounts = await prisma.subAccount.findMany({
      where: { isActive: true }
    });
    
    if (subAccounts.length > 0) {
      console.log(`\n📊 Found ${subAccounts.length} registered sub-account(s):`);
      subAccounts.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.locationName || sub.locationId} (${sub.locationId})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error checking OAuth status:', error.message);
    console.error('\nMake sure:');
    console.error('1. Database is running');
    console.error('2. DATABASE_URL is set in .env');
    console.error('3. Migrations have been run: npm run db:push');
  } finally {
    await prisma.$disconnect();
  }
}

checkOAuth();

