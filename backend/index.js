const express = require('express');
const app = express();
const cors = require('cors');
const contentful = require('contentful');
const path = require('path');
const dotenv = require('dotenv');

// Fix the path resolution using __dirname
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error('ERROR: STRIPE_SECRET_KEY is not defined in .env file');
    process.exit(1);
}

const stripe = require('stripe')(stripeKey);

app.use(cors());

// Create contentful client
const contentfulClient = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
});

// Middleware setup
app.use(express.static('public'));
app.use(express.json());

// Single product checkout
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { productId, size } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Fetch the product from Contentful to verify it exists and get the real price
        const product = await contentfulClient.getEntry(productId);

        if (!product || !product.fields) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Use the verified data from Contentful
        const productName = product.fields.productName;
        const productPrice = product.fields.priceUsd;
        let productImage = product.fields.images[0]?.fields.file.url;

        if (productImage && !productImage.startsWith('http')) {
            productImage = `https:${productImage}`;
        }

        // Convert price to cents for Stripe
        const priceCents = Math.round(parseFloat(productPrice) * 100);

        // Add size to the product name if it exists
        const productNameWithSize = size ? `${productName} (${size})` : productName;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: productNameWithSize, // Include size in the product name
                            images: productImage ? [productImage] : [], // Add the product image URL here
                        },
                        unit_amount: priceCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'MX', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'JP'],
            },
            success_url: `${process.env.DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN}`,
        });

        console.log('Checkout session created:', session);

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cart checkout (multiple items)
app.post('/create-cart-checkout', async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart items are required' });
        }

        // Build line items for Stripe
        const lineItems = await Promise.all(
            items.map(async (item) => {
                // Fetch the product from Contentful to verify it exists and get the real price
                const product = await contentfulClient.getEntry(item.id);

                if (!product || !product.fields) {
                    throw new Error(`Product with ID ${item.id} not found`);
                }

                const productName = product.fields.productName;
                const productPrice = product.fields.priceUsd; // Fetch the price from Contentful
                let productImage = product.fields.images[0]?.fields.file.url; // Get the first image URL

                // Ensure the image URL is fully qualified
                if (productImage && !productImage.startsWith('http')) {
                    productImage = `https:${productImage}`;
                }

                // Convert price to cents for Stripe
                const priceCents = Math.round(parseFloat(productPrice) * 100);

                // Add size to the product name if it exists
                const productNameWithSize = item.size ? `${productName} (${item.size})` : productName;

                return {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: productNameWithSize, // Include size in the product name
                            images: productImage ? [productImage] : [], // Add the product image URL here
                        },
                        unit_amount: priceCents,
                    },
                    quantity: item.quantity,
                };
            })
        );

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'MX', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'JP'],
            },
            success_url: `${process.env.DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN}`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating cart checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Session status endpoint (for checking payment status)
app.get('/session-status', async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);

        res.json({
            status: session.status,
            customer_email: session.customer_details?.email || ''
        });
    } catch (error) {
        console.error('Error retrieving session status:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(4242, () => console.log('Running on port 4242'));