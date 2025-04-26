const FruitMarketplace = artifacts.require("FruitMarketplace");
const { BN, expectRevert } = require('@openzeppelin/test-helpers');

contract("FruitMarketplace", accounts => {
  const [owner, buyer, anotherBuyer] = accounts;
  let fruitMarketplaceInstance;

  beforeEach(async () => {
    fruitMarketplaceInstance = await FruitMarketplace.new({ from: owner });
  });

  // Test 1: Déploiement du contrat
  it("should deploy successfully", async () => {
    assert.ok(fruitMarketplaceInstance.address);
    assert.notEqual(fruitMarketplaceInstance.address, '0x0');
  });

  // Test 2: Ajouter une liste de fruits
  it("should allow a seller to list a fruit", async () => {
    const fruitName = "Apple";
    const fruitPrice = web3.utils.toWei("0.01", "ether");

    const result = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = result.logs[0].args.id.toString();
    
    const fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    
    assert.equal(fruit.name, fruitName);
    assert.equal(fruit.price, fruitPrice);
    assert.equal(fruit.seller, owner);
    assert.equal(fruit.isAvailable, true);
  });

  // Test 3: Acheter un fruit
  it("should allow a buyer to purchase a fruit", async () => {
    const fruitName = "Orange";
    const fruitPrice = web3.utils.toWei("0.01", "ether");

    const listResult = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = listResult.logs[0].args.id.toString();
    
    await fruitMarketplaceInstance.purchaseFruit(fruitId, { from: buyer, value: fruitPrice });
    
    const fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    assert.equal(fruit.isAvailable, false);
    
    const isBuyer = await fruitMarketplaceInstance.fruitBuyers(fruitId, buyer);
    assert.equal(isBuyer, true);
  });

  // Test 4: Vérification de la disponibilité des fruits
  it("should update fruit availability after purchase", async () => {
    const fruitName = "Banana";
    const fruitPrice = web3.utils.toWei("0.01", "ether");

    const listResult = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = listResult.logs[0].args.id.toString();
    
    let fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    assert.equal(fruit.isAvailable, true);
    
    await fruitMarketplaceInstance.purchaseFruit(fruitId, { from: buyer, value: fruitPrice });
    
    fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    assert.equal(fruit.isAvailable, false);
  });

  // Test 5: Évaluation du fournisseur
  it("should allow buyers to rate sellers", async () => {
    const fruitName = "Grapes";
    const fruitPrice = web3.utils.toWei("0.01", "ether");

    const listResult = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = listResult.logs[0].args.id.toString();
    
    await fruitMarketplaceInstance.purchaseFruit(fruitId, { from: buyer, value: fruitPrice });
    
    const rating = 4;
    await fruitMarketplaceInstance.rateSeller(owner, rating, { from: buyer });
    
    const averageRating = await fruitMarketplaceInstance.getSellerAverageRating(owner);
    assert.equal(averageRating.toString(), rating.toString());
  });

  // Test 6: Mise à jour de la liste des fruits
  it("should allow sellers to update fruit price", async () => {
    const fruitName = "Mango";
    const fruitPrice = web3.utils.toWei("0.01", "ether");
    const newFruitPrice = web3.utils.toWei("0.02", "ether");

    const listResult = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = listResult.logs[0].args.id.toString();
    
    await fruitMarketplaceInstance.updateFruitPrice(fruitId, newFruitPrice, { from: owner });
    
    const fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    assert.equal(fruit.price, newFruitPrice);
  });

  // Test 7: Gestion des fonds insuffisants
  it("should revert when buyer has insufficient funds", async () => {
    const fruitName = "Peach";
    const fruitPrice = web3.utils.toWei("0.01", "ether");
    const insufficientFunds = web3.utils.toWei("0.005", "ether");

    const listResult = await fruitMarketplaceInstance.listFruit(fruitName, fruitPrice, { from: owner });
    const fruitId = listResult.logs[0].args.id.toString();
    
    await expectRevert(
      fruitMarketplaceInstance.purchaseFruit(fruitId, { from: buyer, value: insufficientFunds }),
      "Insufficient funds sent"
    );
    
    const fruit = await fruitMarketplaceInstance.getFruit(fruitId);
    assert.equal(fruit.isAvailable, true);
  });
});