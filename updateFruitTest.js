const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FruitMarketplace - Update Fruit Test", function () {
  let fruitMarketplace;
  let owner;
  let buyer;
  let fruitId;
  const initialPrice = ethers.utils.parseEther("0.5");
  const newPrice = ethers.utils.parseEther("0.75");
  const fruitName = "Apple";

  beforeEach(async function () {
    // Deploy the contract
    const FruitMarketplace = await ethers.getContractFactory("FruitMarketplace");
    [owner, buyer] = await ethers.getSigners();
    fruitMarketplace = await FruitMarketplace.deploy();
    await fruitMarketplace.deployed();

    // List a fruit for the test
    const listTx = await fruitMarketplace.listFruit(fruitName, initialPrice);
    const receipt = await listTx.wait();
    
    // Get the fruit ID from the event
    const event = receipt.events.find(event => event.event === "FruitListed");
    fruitId = event.args.id;
  });

  it("Test 6: Mise à jour de la liste des fruits", async function () {
    // Verify initial price
    const initialFruit = await fruitMarketplace.getFruit(fruitId);
    expect(initialFruit.price).to.equal(initialPrice);
    expect(initialFruit.name).to.equal(fruitName);
    
    // Update the fruit price
    const updateTx = await fruitMarketplace.updateFruitPrice(fruitId, newPrice);
    await updateTx.wait();
    
    // Verify the price was updated correctly
    const updatedFruit = await fruitMarketplace.getFruit(fruitId);
    expect(updatedFruit.price).to.equal(newPrice);
    expect(updatedFruit.name).to.equal(fruitName); // Name should remain unchanged
    
    // Verify that only the price changed and other properties remain the same
    expect(updatedFruit.seller).to.equal(owner.address);
    expect(updatedFruit.isAvailable).to.equal(true);
    
    // Verify the event was emitted correctly
    await expect(updateTx)
      .to.emit(fruitMarketplace, "FruitUpdated")
      .withArgs(fruitId, newPrice);
    
    // Try to update a non-existent fruit (should fail)
    const nonExistentFruitId = 999;
    await expect(
      fruitMarketplace.updateFruitPrice(nonExistentFruitId, newPrice)
    ).to.be.revertedWith("Fruit does not exist");
    
    // Try to update a fruit by someone who is not the seller (should fail)
    await expect(
      fruitMarketplace.connect(buyer).updateFruitPrice(fruitId, newPrice)
    ).to.be.revertedWith("Only the seller can update the fruit");
    
    // Try to update a fruit that has been purchased (not available)
    // First, purchase the fruit
    await fruitMarketplace.connect(buyer).purchaseFruit(fruitId, { value: newPrice });
    
    // Then try to update it (should fail)
    await expect(
      fruitMarketplace.updateFruitPrice(fruitId, ethers.utils.parseEther("1.0"))
    ).to.be.revertedWith("Fruit is not available");
  });
});
