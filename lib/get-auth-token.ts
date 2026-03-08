const orgId = process.env.CLOUDFLARE_REALTIMEKIT_ORG_ID!;
const apiKey = process.env.CLOUDFLARE_REALTIMEKIT_API_KEY!;
const presetName = "One Dispatcher";
const authorization = `Basic ${Buffer.from(`${orgId}:${apiKey}`).toString("base64")}`;

type CachedAuthTokenState = {
  tokens?: Map<string, string>;
  inFlight?: Map<string, Promise<string>>;
};

const authTokenState = globalThis as typeof globalThis & CachedAuthTokenState;
authTokenState.tokens ??= new Map();
authTokenState.inFlight ??= new Map();

const cachedTokens = authTokenState.tokens;
const inFlightRequests = authTokenState.inFlight;

type AuthTokenRole = "host" | "viewer";

type GetAuthTokenOptions = {
  role?: AuthTokenRole;
  name?: string;
  cacheKey?: string;
};

export default async function getAuthToken(
  meetingId: string,
  options: GetAuthTokenOptions = {}
) {
  const { role = "viewer", name, cacheKey } = options;
  const requestKey = cacheKey ? `${meetingId}:${cacheKey}` : null;

  if (requestKey) {
    const cachedToken = cachedTokens.get(requestKey);
    if (cachedToken) {
      return cachedToken;
    }

    const inFlightRequest = inFlightRequests.get(requestKey);
    if (inFlightRequest) {
      return inFlightRequest;
    }
  }

  const authTokenRequest = (async () => {
    const participantResponse = await fetch(
      `https://api.realtime.cloudflare.com/v2/meetings/${meetingId}/participants`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name ?? (role === "host" ? "Host" : "Viewer"),
          custom_participant_id: crypto.randomUUID(),
          preset_name: presetName,
        }),
      }
    );

    const participantText = await participantResponse.text();

    if (!participantResponse.ok) {
      throw new Error(
        `Failed to get auth token for meeting ${meetingId}: ${participantResponse.status} ${participantText}`
      );
    }

    const participantData = JSON.parse(participantText);
    const authToken =
      participantData.data?.authToken ??
      participantData.data?.token ??
      participantData.authToken ??
      participantData.token ??
      participantData.result?.authToken ??
      participantData.result?.token;

    if (!authToken) {
      throw new Error(`Auth token missing from participant response for meeting ${meetingId}`);
    }

    if (requestKey) {
      cachedTokens.set(requestKey, authToken);
    }

    return authToken;
  })();

  if (requestKey) {
    inFlightRequests.set(
      requestKey,
      authTokenRequest.finally(() => {
        inFlightRequests.delete(requestKey);
      })
    );
  }

  return authTokenRequest;
}