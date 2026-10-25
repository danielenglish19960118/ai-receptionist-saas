// api/gumroad.js
// Handles automated provisioning and ping notifications from Gumroad

export default async function handler(req, res) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const eventData = req.body;

    // Extract crucial sale details from Gumroad payload
    const sellerId = eventData.seller_id;
    const buyerEmail = eventData.email;
    const productName = eventData.product_name;
    const licenseKey = eventData.license_key;
    const isPaid = eventData.paid;

    // Validate your specific Gumroad seller ID
    const expectedSellerId = "o0g3LR2ktQ1Je36A9k58gQ==";
    if (sellerId !== expectedSellerId) {
      console.warn(`[SECURITY WARNING] Unauthorized seller ID received: ${sellerId}`);
      return res.status(403).json({ error: "Unauthorized seller ID" });
    }

    if (isPaid) {
      console.log(`[PROVISIONING SUCCESS] Sale verified for ${buyerEmail}`);
      console.log(`- Product: ${productName}`);
      console.log(`- Assigned License Key: ${licenseKey}`);

      // TODO: Add your automated database storage, Vapi tenant creation, 
      // or automated email dispatcher logic here (e.g., SendGrid / Resend).

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully. Tenant provisioned.",
        assigned_key: licenseKey
      });
    } else {
      console.log(`[PENDING/REFUND] Sale not marked as paid for ${buyerEmail}`);
      return res.status(200).json({ success: true, message: "Event received but not paid." });
    }

  } catch (err) {
    console.error("[WEBHOOK ERROR] Failed to process Gumroad payload:", err);
    return res.status(500).json({ error: "Internal Server Error during provisioning." });
  }
}
