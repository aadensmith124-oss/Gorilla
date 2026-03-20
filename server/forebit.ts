const FOREBIT_API_BASE = "https://prod-payments-api.forebit.io";

interface CreatePaymentParams {
  amount: number;
  currency?: string;
  returnUrl?: string;
}

interface ForebitPaymentResponse {
  id: string;
  url: string;
  status?: string;
  amount?: number;
  currency?: string;
  [key: string]: any;
}

function getBusinessId(): string {
  const id = process.env.FOREBIT_ACCOUNT_ID;
  if (!id) throw new Error("FOREBIT_ACCOUNT_ID is not configured");
  return id;
}

function getApiKey(): string {
  const key = process.env.FOREBIT_ACCESS_KEY;
  if (!key) throw new Error("FOREBIT_ACCESS_KEY is not configured");
  return key;
}

export async function createForebitPayment(params: CreatePaymentParams): Promise<ForebitPaymentResponse> {
  const businessId = getBusinessId();
  const apiKey = getApiKey();

  const body: Record<string, any> = {
    currency: params.currency || "USD",
    amount: params.amount,
  };

  if (params.returnUrl) {
    body.return_url = params.returnUrl;
    body.returnUrl = params.returnUrl;
    body.success_url = params.returnUrl;
    body.redirect_url = params.returnUrl;
  }

  const response = await fetch(
    `${FOREBIT_API_BASE}/v1/businesses/${businessId}/payments`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Forebit API error:", response.status, errorText);
    throw new Error(`Forebit API error: ${response.status} - ${errorText}`);
  }

  const rawData = await response.json();
  console.log("Forebit API raw response:", JSON.stringify(rawData, null, 2));

  const nested = rawData.data || rawData.result || rawData.payment || {};
  const paymentId = rawData.id || rawData.paymentId || rawData.payment_id || nested.id || nested.paymentId || nested.payment_id;
  const checkoutUrl = rawData.url || rawData.checkoutUrl || rawData.checkout_url || rawData.paymentUrl || rawData.redirect_url || nested.url || nested.checkoutUrl || nested.checkout_url || nested.redirect_url;

  if (!paymentId) {
    console.error("Forebit API: Could not find payment ID in response:", rawData);
    throw new Error("Forebit API returned no payment ID");
  }

  return {
    ...rawData,
    id: paymentId,
    url: checkoutUrl || "",
  };
}

export async function getForebitPayment(paymentId: string): Promise<ForebitPaymentResponse> {
  const businessId = getBusinessId();
  const apiKey = getApiKey();

  const response = await fetch(
    `${FOREBIT_API_BASE}/v1/businesses/${businessId}/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Forebit API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Forebit GET payment response:", JSON.stringify(data, null, 2));
  return data;
}
