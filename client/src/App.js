import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import FruitMarketplaceContract from './contracts/FruitMarketplace.json';
import './App.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [fruits, setFruits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fruitName: '',
    fruitPrice: ''
  });
  const [buyingFruit, setBuyingFruit] = useState(null);
  const [ratingData, setRatingData] = useState({
    sellerAddress: '',
    rating: 1
  });

  useEffect(() => {
    const init = async () => {
      try {
        // Get network provider and web3 instance
        const web3Instance = new Web3(window.ethereum);
        
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3Instance.eth.getAccounts();
        
        // Get the contract instance
        const networkId = await web3Instance.eth.net.getId();
        const deployedNetwork = FruitMarketplaceContract.networks[networkId];
        const contractInstance = new web3Instance.eth.Contract(
          FruitMarketplaceContract.abi,
          deployedNetwork && deployedNetwork.address,
        );
        
        setWeb3(web3Instance);
        setAccounts(accounts);
        setContract(contractInstance);
        
        // Load fruits
        await loadFruits(contractInstance);
        
        setLoading(false);
      } catch (error) {
        console.error("Could not connect to wallet or contract:", error);
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const loadFruits = async (contractInstance) => {
    const contract = contractInstance || window.contract;
    if (!contract) return;
    
    const fruitCount = await contract.methods.getFruitCount().call();
    const fruitsList = [];
    
    for (let i = 0; i < fruitCount; i++) {
      const fruit = await contract.methods.getFruit(i).call();
      fruitsList.push({
        id: fruit.id,
        name: fruit.name,
        price: web3.utils.fromWei(fruit.price, 'ether'),
        seller: fruit.seller,
        isAvailable: fruit.isAvailable
      });
    }
    
    setFruits(fruitsList);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRatingChange = (e) => {
    const { name, value } = e.target;
    setRatingData({
      ...ratingData,
      [name]: value
    });
  };

  const listFruit = async (e) => {
    e.preventDefault();
    
    const { fruitName, fruitPrice } = formData;
    const priceInWei = web3.utils.toWei(fruitPrice, 'ether');
    
    try {
      await contract.methods.listFruit(fruitName, priceInWei).send({ from: accounts[0] });
      setFormData({ fruitName: '', fruitPrice: '' });
      await loadFruits(contract);
      alert('Fruit listed successfully!');
    } catch (error) {
      console.error("Error listing fruit:", error);
      alert('Failed to list fruit');
    }
  };

  const purchaseFruit = async (fruitId, price) => {
    try {
      await contract.methods.purchaseFruit(fruitId).send({ 
        from: accounts[0],
        value: web3.utils.toWei(price, 'ether')
      });
      await loadFruits(contract);
      alert('Fruit purchased successfully!');
    } catch (error) {
      console.error("Error purchasing fruit:", error);
      alert('Failed to purchase fruit');
    }
  };

  const rateSeller = async (e) => {
    e.preventDefault();
    
    const { sellerAddress, rating } = ratingData;
    
    try {
      await contract.methods.rateSeller(sellerAddress, rating).send({ from: accounts[0] });
      setRatingData({ sellerAddress: '', rating: 1 });
      alert('Seller rated successfully!');
    } catch (error) {
      console.error("Error rating seller:", error);
      alert('Failed to rate seller');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fruit Marketplace</h1>
        <p>Your account: {accounts[0]}</p>
      </header>

      <section className="list-fruit-section">
        <h2>List a New Fruit</h2>
        <form onSubmit={listFruit}>
          <div>
            <label>Fruit Name:</label>
            <input
              type="text"
              name="fruitName"
              value={formData.fruitName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Price (ETH):</label>
            <input
              type="number"
              step="0.001"
              name="fruitPrice"
              value={formData.fruitPrice}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit">List Fruit</button>
        </form>
      </section>

      <section className="fruits-section">
        <h2>Available Fruits</h2>
        <div className="fruits-grid">
          {fruits.filter(fruit => fruit.isAvailable).map(fruit => (
            <div key={fruit.id} className="fruit-card">
              <h3>{fruit.name}</h3>
              <p>Price: {fruit.price} ETH</p>
              <p>Seller: {fruit.seller}</p>
              <button onClick={() => purchaseFruit(fruit.id, fruit.price)}>
                Purchase
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="purchased-fruits-section">
        <h2>Purchased Fruits</h2>
        <div className="fruits-grid">
          {fruits.filter(fruit => !fruit.isAvailable).map(fruit => (
            <div key={fruit.id} className="fruit-card purchased">
              <h3>{fruit.name}</h3>
              <p>Price: {fruit.price} ETH</p>
              <p>Seller: {fruit.seller}</p>
              <p>Status: Sold</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rate-seller-section">
        <h2>Rate a Seller</h2>
        <form onSubmit={rateSeller}>
          <div>
            <label>Seller Address:</label>
            <input
              type="text"
              name="sellerAddress"
              value={ratingData.sellerAddress}
              onChange={handleRatingChange}
              required
            />
          </div>
          <div>
            <label>Rating (1-5):</label>
            <input
              type="number"
              min="1"
              max="5"
              name="rating"
              value={ratingData.rating}
              onChange={handleRatingChange}
              required
            />
          </div>
          <button type="submit">Submit Rating</button>
        </form>
      </section>
    </div>
  );
}

export default App;