import fs from 'fs'
import {readFile} from 'fs/promises';
import _ from 'lodash';
import x from "lodash";
import url from 'node:url'

export function handleTest(req, res) {
    return res.status(200).json({
        message: 'Greetings from API server',
        recipientName: req.body.name || 'Stranger',
    });
}

export async function handleSignup(req, res) {
    const usersJson = JSON.parse(await readFile(new URL('./users.json', import.meta.url)));
    console.log(usersJson)
    req.body.token = Date.now()

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    req.body.uuid = uuid()
    usersJson.push(req.body)
    fs.writeFileSync('users.json', JSON.stringify(usersJson, null, 2), function (err) {
        console.log(err);
    });
    return res.status(200).json({
        message: 'Profile created successfully'
    })
}

export async function handleLogin(req, res) {
    const users = JSON.parse(await readFile('users.json'));

    const user = _.find(users, {username: req.body.username, password: req.body.password});
    console.log(user)

    return res.status(200).json(user);
}


export async function handleLogout(req, res) {
    const users = JSON.parse(await readFile('users.json'));

    const user = _.find(users, {token: +req.headers.authorization});
    user.token = Date.now();

    fs.writeFileSync('users.json', JSON.stringify(users, null, 2), function (err) {
        console.log(err);
    });

    return res.status(200).json({
        message: 'Success logout'
    });
}

export async function handleGetProducts(req, res) {
    const products = JSON.parse(await readFile('mockdata_piekarnia.json'));
    const users = JSON.parse(await readFile('users.json'));

    console.log(JSON.stringify(req.headers.authorization));

    const userToken = _.find(users, {token: +req.headers.authorization})
    const language = req.headers['content-language']

    if (userToken === undefined) {
        return res.status(401).json({
            message: 'Not found'
        })
    }
    return res.status(200).send(JSON.stringify(products.map((product) => {
            product.name = product.name[language]
            product.description = product.description[language]
            product.allergyInfo = product.allergyInfo[language]
            return product
        }
    ), null, 2))
}

export async function handleBestsellers(req, res) {
    const bestsellers = JSON.parse(await readFile('bestsellers.json'));
    const users = JSON.parse(await readFile('users.json'));

    console.log(JSON.stringify(req.headers.authorization));

    const userToken = _.find(users, {token: +req.headers.authorization})
    const language = req.headers['content-language']

    if (userToken === undefined) {
        return res.status(401).json({
            message: 'Not found'
        })
    }
    return res.status(200).send(JSON.stringify(bestsellers.map((product) => {
            product.name = product.name[language]
            product.description = product.description[language]
            product.allergyInfo = product.allergyInfo[language]
            return product
        }
    ), null, 2))
}

export function handleGetOrders(req, res) {
    const orders = JSON.parse(fs.readFileSync('ordersList.json'));
    const users = JSON.parse(fs.readFileSync('users.json'));

    const user = _.find(users, {token: +req.headers.authorization})
    const userOrders = _.find(orders, {user_uuid: user.uuid})?.user_orders

    if (user === undefined) {
        return res.status(401).json({
            message: 'Not found'
        })
    }
    return res.status(200).json(userOrders)
}

export function handleAddOrders(req, res) {
    const orders = JSON.parse(fs.readFileSync('ordersList.json'));

    const usersJson = JSON.parse(fs.readFileSync('./users.json'));
    const user = _.find(usersJson, {token: +req.headers.authorization})
    const userOrders = _.find(orders, {user_uuid: user.uuid})?.user_orders

    if (userOrders) {
        userOrders.push(req.body)
    } else {
        orders.push({user_uuid: user.uuid, user_orders: [req.body]})
    }
    fs.writeFileSync('ordersList.json', JSON.stringify(orders, null, 2), function (err) {
        console.log(err);
    })

    const kitchen = JSON.parse(fs.readFileSync('./kitchen.json'));
    const dateObj = new Date(req.body.date);
    const dayKey = req.body.date.split(' ')[0];
    const shiftKey = `shift${Math.ceil((dateObj.getHours() + 1) / 8)}`;

    const kitchenNewData = req.body.products.map(({uuid, name, quantity}) => ({
        uuid,
        name,
        quantity,
        product_status: 'Ordered'
    }));

    if (!kitchen[dayKey]) {
        kitchen[dayKey] = {
            [shiftKey]: [...kitchenNewData]
        }
    } else if (kitchen[dayKey][shiftKey]) {
        kitchenNewData.forEach((requestProduct) => {
            kitchen[dayKey][shiftKey].forEach((kitchenProduct) => {
                if (kitchenProduct.uuid === requestProduct.uuid && !requestProduct.omit) {
                    kitchenProduct.quantity += requestProduct.quantity
                    requestProduct.omit = true
                }
            })
        })

        kitchen[dayKey][shiftKey].push(...kitchenNewData.filter(({omit}) => !omit))
    } else {
        kitchen[dayKey][shiftKey] = [
            ...kitchen[dayKey]?.[shiftKey] || [],
            ...kitchenNewData
        ]
    }

    fs.writeFileSync('kitchen.json', JSON.stringify(kitchen, null, 2), function (err) {
        console.log(err);
    })

    return res.status(200).json({
        message: 'Order placed successfully'
    })
}

export async function handleChangeStatus(req, res) {
    const ordersList = JSON.parse(fs.readFileSync('ordersList.json'))
    const userOrders = _.find(ordersList, {user_uuid: req.body.user.user_uuid})?.user_orders
    const currentOrder = _.find(userOrders, {order_uuid: req.body.order.order_uuid})
    if (currentOrder) {
        currentOrder.status = req.body.status
    }
    fs.writeFileSync('ordersList.json', JSON.stringify(ordersList, null, 2), function (err) {
        console.log(err);
    });
    console.log('lol', ordersList)
    return res.status(200).json({
        message: 'Status changed'
    })
}

export async function handleUserStatusProgress(req, res) {
    const orders = JSON.parse(fs.readFileSync('ordersList.json'))

    const result = orders.map(({user_uuid, user_orders}) => ({
        user_uuid,
        declinedCount: user_orders.filter(({status}) => status === 'Preparing').length / user_orders.length * 100
    }))
    console.log(result)
    return res.status(200).json(result)
}


export async function handleAdminLogout(req, res) {
    const users = JSON.parse(await readFile('users.json'));

    const admin = _.find(users, {token: +req.headers.authorization});
    req.body.token = Date.now();

    fs.writeFileSync('admin.json', JSON.stringify(admin, null, 2), function (err) {
        console.log(err);
    });

    return res.status(200).json({
        message: 'Success logout'
    });
}

export async function handleAdminGetOrders(req, res) {
    const users = JSON.parse(fs.readFileSync('users.json'))
    const orders = JSON.parse(fs.readFileSync('ordersList.json'))

    const result = orders.map((x) => {
        const copy = {...x}
        copy.name = _.find(users, {uuid: copy.user_uuid})?.name
        return copy
    })
    return res.status(200).json(result)
}

export async function handleManagerLogout(req, res) {
    const users = JSON.parse(await readFile('users.json'));

    const manager = _.find(users, {token: +req.headers.authorization});
    req.body.token = Date.now();

    fs.writeFileSync('manager.json', JSON.stringify(manager, null, 2), function (err) {
        console.log(err);
    });

    return res.status(200).json({
        message: 'Success logout'
    });
}

export async function handleRemoveOrderItem(req, res) {
    const ordersList = JSON.parse(fs.readFileSync('ordersList.json'))
    const userOrders = _.find(ordersList, {user_uuid: req.body.userUuid})?.user_orders
    const order = _.find(userOrders, {order_uuid: req.body.orderUuid})?.products
    const product = _.find(order, {uuid: req.body.productUuid})
    const orderItemIndex = order.indexOf(product)

    if (product) {
        order.splice(orderItemIndex, 1)
    }
    fs.writeFileSync('ordersList.json', JSON.stringify(ordersList, null, 2), function (err) {
        console.log(err);
    });
    return res.status(200).json({
        message: 'Order declined'
    })
}

export async function handleAMDeclineOrder(req, res) {
    const ordersList = JSON.parse(fs.readFileSync('ordersList.json'))
    const userOrders = _.find(ordersList, {user_uuid: req.body.userUuid})?.user_orders
    const order = _.find(userOrders, {order_uuid: req.body.orderUuid})
    if (order) {
        order.status = 'Declined'
    }
    fs.writeFileSync('ordersList.json', JSON.stringify(ordersList, null, 2), function (err) {
        console.log(err);
    });
    return res.status(200).json({
        message: 'Order declined'
    })
}

export async function handleChefLogout(req, res) {
    const users = JSON.parse(await readFile('users.json'));

    const chef = _.find(users, {token: +req.headers.authorization});
    req.body.token = Date.now();

    fs.writeFileSync('manager.json', JSON.stringify(chef, null, 2), function (err) {
        console.log(err);
    });

    return res.status(200).json({
        message: 'Success logout'
    });
}

export function handleReports(req, res) {
    const orders = JSON.parse(fs.readFileSync('ordersList.json'))
    const {date: reportDate} = url.parse(req.url, true).query

    const getShiftData = (shift) => orders.reduce((memo, user) => {
        user.user_orders.forEach(({date, order_production_cost, order_total}) => {
            let [orderDay] = date.split(' ')
            if (orderDay === reportDate && Math.ceil((new Date(date).getHours() + 1) / 8) === shift) {
                memo[`shift${shift}`].order_production_cost += order_production_cost;
                memo[`shift${shift}`].order_total += order_total
            }
        })
        memo[`shift${shift}`].profit = memo[`shift${shift}`].order_total - memo[`shift${shift}`].order_production_cost
        return memo
    }, {
        [`shift${shift}`]: {
            order_production_cost: 0,
            order_total: 0,
            profit: 0
        }
    })

    const report = {
        ...getShiftData(1),
        ...getShiftData(2),
        ...getShiftData(3)
    }
    return res.status(200).json(report)
}

export function handleChefGetOrders(req, res) {
    const chefOrders = JSON.parse(fs.readFileSync('kitchen.json'))
    const users = JSON.parse(fs.readFileSync('users.json'))

    const user = _.find(users, {token: +req.headers.authorization})

    if (user === undefined) {
        return res.status(401).json({
            message: 'Not found'
        })
    }
    return res.status(200).json(chefOrders)
}

export async function handleKitchenOrderStatus(req, res) {
    const {ordersDate, shiftKey, order, status} = req.body;
    const kitchenOrders = JSON.parse(fs.readFileSync('kitchen.json'))
    const ordersList = JSON.parse(fs.readFileSync('ordersList.json'))

    const currentOrder = _.find(
        kitchenOrders[ordersDate][shiftKey],
        {uuid: order.uuid}
    )
    currentOrder.product_status = status

    ordersList.forEach(({user_orders}) => {
        user_orders.forEach(({products}) => {
            products.forEach((product) => {
                if (product.uuid === order.uuid) {
                    product.product_status = status
                    product.sell_status = status === 'Done' ? 'Ready to sell' : 'Waiting'
                }
            })
        })
    })

    fs.writeFileSync('kitchen.json', JSON.stringify(kitchenOrders, null, 2), function (err) {
        console.log(err);
    });
    fs.writeFileSync('ordersList.json', JSON.stringify(ordersList, null, 2), function (err) {
        console.log(err);
    });

    return res.status(200).json({
        message: 'Status changed'
    })
}