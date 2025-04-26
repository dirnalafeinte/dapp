// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FruitMarketplace {
    struct Fruit {
        uint256 id;
        string name;
        uint256 price;
        address seller;
        bool isAvailable;
    }

    struct SellerRating {
        uint256 totalRating;
        uint256 ratingCount;
    }

    uint256 private fruitCounter = 0;
    mapping(uint256 => Fruit) public fruits;
    mapping(address => SellerRating) public sellerRatings;
    mapping(uint256 => mapping(address => bool)) public fruitBuyers;

    event FruitListed(uint256 id, string name, uint256 price);
    event FruitPurchased(uint256 id, address buyer);
    event SellerRated(address seller, uint256 rating);
    event FruitUpdated(uint256 id, uint256 newPrice);

    function listFruit(string memory _name, uint256 _price) public returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        
        uint256 fruitId = fruitCounter;
        fruits[fruitId] = Fruit({
            id: fruitId,
            name: _name,
            price: _price,
            seller: msg.sender,
            isAvailable: true
        });
        
        fruitCounter++;
        
        emit FruitListed(fruitId, _name, _price);
        return fruitId;
    }

    function purchaseFruit(uint256 _fruitId) public payable {
        Fruit storage fruit = fruits[_fruitId];
        
        require(fruit.isAvailable, "Fruit is not available for purchase");
        require(msg.value >= fruit.price, "Insufficient funds sent");
        require(fruit.seller != msg.sender, "Seller cannot buy their own fruit");
        
        fruit.isAvailable = false;
        fruitBuyers[_fruitId][msg.sender] = true;
        
        // Transfer the payment to the seller
        (bool sent, ) = payable(fruit.seller).call{value: msg.value}("");
        require(sent, "Failed to send payment to seller");
        
        emit FruitPurchased(_fruitId, msg.sender);
    }

    function rateSeller(address _seller, uint256 _rating) public {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        // Check if the seller has listed any fruit
        bool isValidSeller = false;
        for (uint i = 0; i < fruitCounter; i++) {
            if (fruits[i].seller == _seller && fruitBuyers[i][msg.sender]) {
                isValidSeller = true;
                break;
            }
        }
        require(isValidSeller, "You can only rate sellers from whom you've purchased");
        
        SellerRating storage rating = sellerRatings[_seller];
        rating.totalRating += _rating;
        rating.ratingCount++;
        
        emit SellerRated(_seller, _rating);
    }

    function getSellerAverageRating(address _seller) public view returns (uint256) {
        SellerRating storage rating = sellerRatings[_seller];
        if (rating.ratingCount == 0) {
            return 0;
        }
        return rating.totalRating / rating.ratingCount;
    }

    function updateFruitPrice(uint256 _fruitId, uint256 _newPrice) public {
        Fruit storage fruit = fruits[_fruitId];
        
        require(fruit.seller == msg.sender, "Only the seller can update the fruit");
        require(fruit.isAvailable, "Fruit is not available for update");
        require(_newPrice > 0, "Price must be greater than 0");
        
        fruit.price = _newPrice;
        
        emit FruitUpdated(_fruitId, _newPrice);
    }

    function getFruit(uint256 _fruitId) public view returns (
        uint256 id,
        string memory name,
        uint256 price,
        address seller,
        bool isAvailable
    ) {
        Fruit storage fruit = fruits[_fruitId];
        return (
            fruit.id,
            fruit.name,
            fruit.price,
            fruit.seller,
            fruit.isAvailable
        );
    }

    function getFruitCount() public view returns (uint256) {
        return fruitCounter;
    }
}