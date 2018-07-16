App = {
  web3Provider: null,
  contracts: {},
  account: null,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('../WETH9.json', function(data) {
      var Weth9Artifact = data;
      let contract = TruffleContract(Weth9Artifact);
      contract.setProvider(App.web3Provider);

      contract.deployed().then(function(instance) {
        App.contracts.Weth9 = instance
      });
    });
    $.getJSON('../FlxSale.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var FlxSaleArtifact = data;
      let contract = TruffleContract(FlxSaleArtifact);
      contract.setProvider(App.web3Provider);

      contract.deployed().then(function(instance) {
        App.contracts.FlxSale = instance;

        // Use our contract to retrieve and mark the adopted pets
        web3.eth.getAccounts(function(error, accounts) {
          if (error) {
            console.log(error);
          }
          App.account = accounts[0];
          // For now just reload screen when someone pledges
          instance.Claimed().watch(function() {
            console.log("Claimed");
            App.getSaleStatus(accounts[0])
          });
          instance.Pledged().watch(function() {
            console.log("Pledged");
            App.getSaleStatus(accounts[0])
          });
          return App.getSaleStatus(accounts[0]);
        });
      });
    });
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-pledge', App.handlePledge);
    $(document).on('click', '.btn-claim', App.handleClaim);
  },

  getSaleStatus: function(account) {
    App.contracts.FlxSale.pledgedTotal().then(function(totalPledged) {
      let remaining = 10000-(totalPledged * 10)
      $('#remaining').text(remaining);
      $('.slider').attr("max",remaining);
    });
    App._setText(App.contracts.FlxSale.amountPledged(account, {from: account})
      .then(function(amount) {return amount * 10}), $('#pledged')).
      then(function() {
        App.contracts.FlxSale.stage().then(function(stage) {
          if (stage > 0) {
            $('#status').text("Sale Complete");
            $('#pledge').hide();
            $('#claim .btn-claim').attr('disabled', ($('#pledged').text() == 0))
            $('#claim').show();
          } else {
            $('#status').text("Sale Running");
            $('#pledge').show();
          }
        });
      });
    App._setText(App.contracts.FlxSale.balanceOf(account, {from: account})
      .then(function(amount) {return amount * 10}), $('#claimed'));
  },

  handlePledge: function(event) {
    event.preventDefault();
    let amount = parseInt($('#slider-value').text()) / 10.0;
    console.log("deposit");
    return App.contracts.Weth9.deposit({value: amount * 10**18, from: App.account}).then(function() {
        console.log("approve");
        return App.contracts.Weth9.approve(App.contracts.FlxSale.address, amount, {from: App.account});
    }).then(function() {
      console.log("pledge");
      return App.contracts.FlxSale.pledge(amount, {from: App.account});
    });
  },

  handleClaim: function(event) {
    event.preventDefault();
    App.contracts.FlxSale.claim();
  },

  _setText: function(future, target) {
    return future.then(function(result) {
      target.text(result);
    }).catch(function(err) {
      console.log(err.message);
    });
  }

};

$(function() {
  $(window).load(function() {
    App.init();

    var slider = document.getElementById("myRange");
    var output = document.getElementById("slider-value");
    output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
  slider.oninput = function() {
      output.innerHTML = this.value;
  }
  });
});
