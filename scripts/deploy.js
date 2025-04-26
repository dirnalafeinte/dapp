// scripts/deploy.js
async function main() {
    // Récupérer le contrat à déployer
    const FruitMarketplace = await ethers.getContractFactory("FruitMarketplace");
    
    // Déployer le contrat
    console.log("Déploiement du contrat FruitMarketplace...");
    const fruitMarketplace = await FruitMarketplace.deploy();
  
    // Attendre que le déploiement soit terminé
    await fruitMarketplace.waitForDeployment();
  
    console.log("FruitMarketplace déployé à l'adresse:", await fruitMarketplace.getAddress());
  }
  
  // Exécuter le script de déploiement
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });