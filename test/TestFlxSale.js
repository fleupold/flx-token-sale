const { assertRejects } = require('./utils.js')
const { wait } = require('@digix/tempo')(web3)
const FlxSale = artifacts.require('FlxSale')
const WETH9 = artifacts.require('WETH9')

contract('FlxSale', accounts => {
  const [alice, bob] = accounts

  it('can pledge if weth approved', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 100})
    await wethContract.approve(sale.address, 100)

    await sale.pledge(100)
    assert.equal(await sale.pledgedTotal(), 100)
  })

  it('cannot pledge if weth not approved', async () => {
    const wethContract = await WETH9.deployed()
    sale = await FlxSale.new(wethContract.address)

    await assertRejects(sale.pledge(100))
  })

  it('cannot pledge if 1000 have already been bought', async () => {
    const wethContract = await WETH9.deployed()
    sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 1100})
    await wethContract.approve(sale.address, 1100)
    await sale.pledge(1000)

    await assertRejects(sale.pledge(100))
  })

  it('cannot pledge and exceed pledge limit', async () => {
    const wethContract = await WETH9.deployed()
    sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 1100})
    await wethContract.approve(sale.address, 1100)
    await sale.pledge(900)

    await assertRejects(sale.pledge(200))
  })

  it ('cannot claim if sale not complete', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 100})
    await wethContract.approve(sale.address, 100)
    await sale.pledge(100)

    await assertRejects(sale.claim())
  })

  it ('cannot claim immediately after sale is complete', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 1000})
    await wethContract.approve(sale.address, 1000)
    await sale.pledge(1000)

    await assertRejects(sale.claim())
  })

  it ('can claim 2 minutes after sale is complete', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 1000, from: alice})
    await wethContract.approve(sale.address, 1000, {from: alice})
    await sale.pledge(1000, {from: alice})

    await wait(200)
    await sale.claim({from: alice})
    assert.equal(await sale.balanceOf(alice), 10000)
  })

  it ('claiming twice only adds once', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 500, from: alice})
    await wethContract.approve(sale.address, 500, {from: alice})
    await sale.pledge(500, {from: alice})

    await wethContract.deposit({value: 500, from: bob})
    await wethContract.approve(sale.address, 500, {from: bob})
    await sale.pledge(500, {from: bob})

    await wait(200)
    await sale.claim({from: alice})
    await sale.claim({from: alice})

    assert.equal(await sale.balanceOf(alice), 5000)
  })

  it ('claim adds to previously transferred scam tokens', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address)

    await wethContract.deposit({value: 500, from: alice})
    await wethContract.approve(sale.address, 500, {from: alice})
    await sale.pledge(500, {from: alice})

    await wethContract.deposit({value: 500, from: bob})
    await wethContract.approve(sale.address, 500, {from: bob})
    await sale.pledge(500, {from: bob})

    await wait(200)
    await sale.claim({from: alice})
    await sale.transfer(bob, 5000, {from: alice})

    await sale.claim({from: bob})
    assert.equal(await sale.balanceOf(bob), 10000)
  })

  it ('allows only owner to drain funds', async () => {
    const wethContract = await WETH9.new()
    const sale = await FlxSale.new(wethContract.address, {from: bob})

    await wethContract.deposit({value: 500, from: alice})
    await wethContract.approve(sale.address, 500, {from: alice})
    await sale.pledge(500, {from: alice})

    assertRejects(sale.drainFunds({from: alice}))

    await sale.drainFunds({from: bob})
    assert.equal(await wethContract.balanceOf(bob), 500)
  })
})
