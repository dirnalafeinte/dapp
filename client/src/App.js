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
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fruitName: '',
    fruitPrice: ''
  });
  const [ratingData, setRatingData] = useState({
    sellerAddress: '',
    rating: 1
  });
  const [updatePriceData, setUpdatePriceData] = useState({
    fruitId: null,
    newPrice: ''
  });

  // Separate function to initialize contract
  const initializeContract = async (web3Instance) => {
    try {
      const networkId = await web3Instance.eth.net.getId();
      console.log("Network ID:", networkId);
      
      const deployedNetwork = FruitMarketplaceContract.networks[networkId];
      if (!deployedNetwork) {
        throw new Error(`Contract not deployed on network ${networkId}`);
      }
      
      const contractInstance = new web3Instance.eth.Contract(
        FruitMarketplaceContract.abi,
        deployedNetwork.address
      );
      
      console.log("Contract address:", deployedNetwork.address);
      return contractInstance;
    } catch (error) {
      console.error("Error initializing contract:", error);
      throw error;
    }
  };

  const loadFruits = async () => {
    try {
      if (!contract) return;

      const fruitCount = await contract.methods.getFruitCount().call();
      const fruitsList = [];

      for (let i = 0; i < fruitCount; i++) {
        const fruit = await contract.methods.getFruit(i).call();
        const rating = await contract.methods.getSellerAverageRating(fruit.seller).call();
        const hasPurchased = await contract.methods.fruitBuyers(i, accounts[0]).call();
        
        fruitsList.push({
          id: i,
          name: fruit.name,
          price: web3.utils.fromWei(fruit.price, 'ether'),
          seller: fruit.seller,
          isAvailable: fruit.isAvailable,
          hasPurchased: hasPurchased,
          rating: rating > 0 ? rating : null
        });
      }

      setFruits(fruitsList);
    } catch (error) {
      console.error("Error loading fruits:", error);
      setError("Failed to load fruits: " + error.message);
    }
  };

  const connectWallet = async () => {
    try {
      setError(null);
      setLoading(true);
      
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        setAccounts(accounts);
        
        const contractInstance = await initializeContract(web3Instance);
        setContract(contractInstance);
        setIsConnected(true);
        
        await loadFruits();
      } else {
        setError('Please install MetaMask to use this application');
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      setError('Failed to connect to wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to load fruits without requiring wallet connection
  const loadFruitsPublic = async () => {
    try {
      // Create a read-only web3 instance
      const readOnlyWeb3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
      
      // Get network ID
      const networkId = await readOnlyWeb3.eth.net.getId();
      console.log("Network ID (public):", networkId);
      
      // Get contract instance
      const deployedNetwork = FruitMarketplaceContract.networks[networkId];
      if (!deployedNetwork) {
        throw new Error(`Contract not deployed on network ${networkId}`);
      }
      
      const contractInstance = new readOnlyWeb3.eth.Contract(
        FruitMarketplaceContract.abi,
        deployedNetwork.address
      );
      
      console.log("Contract address (public):", deployedNetwork.address);
      
      // Load fruits
      const fruitCount = await contractInstance.methods.getFruitCount().call();
      const fruitsList = [];

      for (let i = 0; i < fruitCount; i++) {
        const fruit = await contractInstance.methods.getFruit(i).call();
        const rating = await contractInstance.methods.getSellerAverageRating(fruit.seller).call();
        
        fruitsList.push({
          id: i,
          name: fruit.name,
          price: readOnlyWeb3.utils.fromWei(fruit.price, 'ether'),
          seller: fruit.seller,
          isAvailable: fruit.isAvailable,
          hasPurchased: false, // Default to false for public view
          rating: rating > 0 ? rating : null
        });
      }

      setFruits(fruitsList);
      setLoading(false);
    } catch (error) {
      console.error("Error loading fruits (public):", error);
      setError("Failed to load fruits: " + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load fruits immediately without requiring wallet connection
    loadFruitsPublic();
    
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();

    // Add event listeners
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length > 0) {
          // Reset states
          setFruits([]);
          setLoading(true);
          // Reconnect wallet
          await connectWallet();
        } else {
          setAccounts([]);
          setIsConnected(false);
          // Load public fruits when disconnected
          await loadFruitsPublic();
        }
      };

      const handleChainChanged = async () => {
        // Reset states
        setFruits([]);
        setLoading(true);
        // Reconnect wallet
        await connectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

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
    try {
      setError(null);
      if (!web3 || !contract || !accounts[0]) {
        setError('Please connect your wallet first');
        return;
      }

      const { fruitName, fruitPrice } = formData;
      if (!fruitName || !fruitPrice) {
        setError('Please fill in all fields');
        return;
      }

      const priceInWei = web3.utils.toWei(fruitPrice, 'ether');
      await contract.methods.listFruit(fruitName, priceInWei).send({ from: accounts[0] });
      
      setFormData({ fruitName: '', fruitPrice: '' });
      await loadFruits();
    } catch (error) {
      console.error("Error listing fruit:", error);
      setError('Failed to list fruit: ' + error.message);
    }
  };

  const purchaseFruit = async (fruitId, price) => {
    try {
      setError(null);
      if (!web3 || !contract || !accounts[0]) {
        setError('Please connect your wallet first');
        return;
      }

      const priceInWei = web3.utils.toWei(price, 'ether');
      const fruit = await contract.methods.getFruit(fruitId).call();
      
      if (priceInWei !== fruit.price) {
        setError('Price mismatch detected. Please refresh the page.');
        return;
      }

      const balance = await web3.eth.getBalance(accounts[0]);
      const balanceInWei = web3.utils.toBN(balance);
      const priceInWeiBN = web3.utils.toBN(priceInWei);
      
      if (balanceInWei.lt(priceInWeiBN)) {
        setError('Insufficient balance. Please add more ETH to your account.');
        return;
      }

      await contract.methods.purchaseFruit(fruitId).send({ 
        from: accounts[0],
        value: priceInWei,
        gas: 300000
      });

      await loadFruits();
    } catch (error) {
      console.error("Error purchasing fruit:", error);
      setError('Failed to purchase fruit: ' + error.message);
    }
  };

  const rateSeller = async (sellerAddress, rating) => {
    try {
      setError(null);
      if (!web3 || !contract || !accounts[0]) {
        setError('Please connect your wallet first');
        return;
      }

      const fruit = fruits.find(f => f.seller.toLowerCase() === sellerAddress.toLowerCase());
      if (!fruit) {
        setError('Fruit not found');
        return;
      }

      await contract.methods.rateSeller(sellerAddress, rating).send({ from: accounts[0] });
      
      // Update the local state to show the rating
      setFruits(fruits.map(f => 
        f.seller.toLowerCase() === sellerAddress.toLowerCase() ? { ...f, rating } : f
      ));
    } catch (error) {
      console.error("Error rating seller:", error);
      setError('Failed to rate seller: ' + error.message);
    }
  };

  const updateFruitPrice = async () => {
    try {
      setError(null);
      if (!web3 || !contract || !accounts[0]) {
        setError('Please connect your wallet first');
        return;
      }

      const { fruitId, newPrice } = updatePriceData;
      
      if (fruitId === null || !newPrice) {
        setError('Please select a fruit and enter a new price');
        return;
      }

      // Convert price to wei
      const priceInWei = web3.utils.toWei(newPrice, 'ether');
      
      // Update the fruit price
      await contract.methods.updateFruitPrice(fruitId, priceInWei).send({ 
        from: accounts[0],
        gas: 300000
      });
      
      // Reset form and reload fruits
      setUpdatePriceData({ fruitId: null, newPrice: '' });
      await loadFruits();
      
      setError('Price updated successfully!');
    } catch (error) {
      console.error("Error updating fruit price:", error);
      setError('Failed to update price: ' + error.message);
    }
  };

  if (loading && !isConnected) {
    return (
      <div className="App">
        <div className="hero-section">
          <h1>Fruit Marketplace</h1>
          <p>Discover and trade unique digital fruits on the blockchain</p>
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="hero-section">
        <h1>Fruit Marketplace</h1>
        <p>Discover and trade unique digital fruits on the blockchain</p>
        <div className="wallet-info">
          {!isConnected ? (
            <button className="connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <p>Connected: {accounts[0]?.slice(0, 6)}...{accounts[0]?.slice(-4)}</p>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Available Fruits section - shown to all users */}
      <section className="marketplace-section">
        <h2 className="section-title">Available Fruits</h2>
        <div className="fruits-grid">
          {fruits.filter(fruit => fruit.isAvailable).map(fruit => (
            <div key={fruit.id} className="fruit-card">
              <div className="fruit-image">
                {fruit.name.charAt(0).toUpperCase()}
              </div>
              <div className="fruit-content">
                <h3>{fruit.name}</h3>
                <p className="price">{fruit.price} ETH</p>
                <p className="seller">Seller: {fruit.seller.slice(0, 6)}...{fruit.seller.slice(-4)}</p>
                {isConnected ? (
                  <button onClick={() => purchaseFruit(fruit.id, fruit.price)}>
                    Purchase
                  </button>
                ) : (
                  <button onClick={connectWallet}>
                    Connect Wallet to Purchase
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isConnected && (
        <>

          <section className="marketplace-section">
            <h2 className="section-title">Your Purchases</h2>
            <div className="fruits-grid">
              {fruits.filter(fruit => fruit.hasPurchased).map(fruit => (
                <div key={fruit.id} className="fruit-card">
                  <div className="fruit-image">
                    {fruit.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="fruit-content">
                    <h3>{fruit.name}</h3>
                    <p className="price">{fruit.price} ETH</p>
                    <p className="seller">Seller: {fruit.seller.slice(0, 6)}...{fruit.seller.slice(-4)}</p>
                    {!fruit.rating && (
                      <div className="rating-section">
                        <p>Rate this seller:</p>
                        <div className="rating-buttons">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              className="rating-button"
                              onClick={() => rateSeller(fruit.seller, star)}
                            >
                              {star} ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {fruit.rating && (
                      <p className="rating">Your rating: {fruit.rating} ⭐</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="list-fruit-section">
            <h2 className="section-title">List a New Fruit</h2>
            <div className="form-container">
              <form onSubmit={listFruit}>
                <div className="form-group">
                  <label>Fruit Name</label>
                  <input
                    type="text"
                    name="fruitName"
                    value={formData.fruitName}
                    onChange={(e) => setFormData({ ...formData, fruitName: e.target.value })}
                    placeholder="Enter fruit name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    name="fruitPrice"
                    value={formData.fruitPrice}
                    onChange={(e) => setFormData({ ...formData, fruitPrice: e.target.value })}
                    placeholder="Enter price in ETH"
                    required
                  />
                </div>
                <button type="submit" className="connect-button">List Fruit</button>
              </form>
            </div>
          </section>

          {/* Your Listed Fruits section */}
          <section className="marketplace-section">
            <h2 className="section-title">Your Listed Fruits</h2>
            <div className="fruits-grid">
              {fruits.filter(fruit => fruit.isAvailable && fruit.seller.toLowerCase() === accounts[0].toLowerCase()).map(fruit => (
                <div key={fruit.id} className="fruit-card">
                  <div className="fruit-image">
                    {fruit.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="fruit-content">
                    <h3>{fruit.name}</h3>
                    <p className="price">{fruit.price} ETH</p>
                    <p className="seller">Listed by you</p>
                    <button 
                      onClick={() => setUpdatePriceData({ ...updatePriceData, fruitId: fruit.id })}
                      className="select-button"
                    >
                      Select to Update Price
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {fruits.filter(fruit => fruit.isAvailable && fruit.seller.toLowerCase() === accounts[0].toLowerCase()).length === 0 && (
              <p className="no-items-message">You haven't listed any fruits yet.</p>
            )}
          </section>

          {/* Update Price Section - Separate dedicated section */}
          <section className="update-price-section">
            <h2 className="section-title">Update Fruit Price</h2>
            <div className="form-container">
              <form onSubmit={(e) => {
                e.preventDefault();
                updateFruitPrice();
              }}>
                <div className="form-group">
                  <label>Selected Fruit</label>
                  <div className="selected-fruit">
                    {updatePriceData.fruitId !== null ? (
                      <div>
                        <p><strong>Name:</strong> {fruits.find(f => f.id === updatePriceData.fruitId)?.name}</p>
                        <p><strong>Current Price:</strong> {fruits.find(f => f.id === updatePriceData.fruitId)?.price} ETH</p>
                      </div>
                    ) : (
                      <p>No fruit selected. Please select a fruit from your listings above.</p>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>New Price (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={updatePriceData.newPrice}
                    onChange={(e) => setUpdatePriceData({ ...updatePriceData, newPrice: e.target.value })}
                    placeholder="Enter new price in ETH"
                    required
                    disabled={updatePriceData.fruitId === null}
                  />
                </div>
                <button 
                  type="submit" 
                  className="connect-button"
                  disabled={updatePriceData.fruitId === null}
                >
                  Update Price
                </button>
              </form>
            </div>
          </section>

          <section className="marketplace-section">
            <h2 className="section-title">Rate a Seller</h2>
            <div className="form-container">
              <form onSubmit={(e) => {
                e.preventDefault();
                rateSeller(ratingData.sellerAddress, ratingData.rating);
              }}>
                <div className="form-group">
                  <label>Seller Address</label>
                  <input
                    type="text"
                    name="sellerAddress"
                    value={ratingData.sellerAddress}
                    onChange={(e) => setRatingData({ ...ratingData, sellerAddress: e.target.value })}
                    placeholder="Enter seller address"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    name="rating"
                    value={ratingData.rating}
                    onChange={(e) => setRatingData({ ...ratingData, rating: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <button type="submit" className="connect-button">Rate Seller</button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;