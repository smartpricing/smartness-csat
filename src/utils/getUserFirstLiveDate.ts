import { ApiGatewayClient } from '../clients/ApiGatewayClient.js';
import { logger } from './logger.js';

type UserResponse = {
  items: {
    metadata: {
      id: string;
    };
    spec: {
      username: string;
    };
  }[];
};

type PropertySetResponse = {
  items: {
    spec: {
      kind: string;
      property_set_id: string;
    };
  }[];
};

type LifecycleResponse = {
  items: {
    metadata: {
      bundle: string;
      name: string;
      insertDate: string;
      lifecycleStateName: string;
    };
  }[];
};

async function getUserIdByEmail(
  apiGatewayClient: ApiGatewayClient,
  userEmail: string,
): Promise<number | undefined> {
  const response = await apiGatewayClient.get<UserResponse>('/api/user/v1/users', {
    username: userEmail,
  });

  const user = response.items.find((item) => item.spec.username === userEmail);
  if (!user) {
    return undefined;
  }

  return Number.parseInt(user.metadata.id, 10);
}

async function getPropertySetIds(
  apiGatewayClient: ApiGatewayClient,
  userId: number,
): Promise<string[]> {
  const response = await apiGatewayClient.get<PropertySetResponse>(
    `/api/user/v1/users/${userId}/property_set`,
    { kind: 'Physical' },
  );

  return response.items
    .filter((item) => item.spec.kind === 'Physical')
    .map((item) => item.spec.property_set_id);
}

async function getFirstLiveDateByAccommodationIds(
  apiGatewayClient: ApiGatewayClient,
  accommodationIds: string[],
): Promise<Date | undefined> {
  const results = await Promise.all(
    accommodationIds.map(async (accommodationId) => {
      const response = await apiGatewayClient.get<LifecycleResponse>(
        `/api/lifecycle/v3/propertysetstate/${accommodationId}`,
      );

      return response.items.reduce((acc, item) => {
        if (
          item.metadata.bundle === 'smartpricing' &&
          item.metadata.lifecycleStateName === 'live'
        ) {
          acc.push(new Date(item.metadata.insertDate));
        }
        return acc;
      }, [] as Date[]);
    }),
  );

  const liveDates = results.flat();

  if (liveDates.length === 0) {
    return undefined;
  }

  let firstLiveDate = liveDates[0];
  for (const item of liveDates) {
    if (firstLiveDate && firstLiveDate > item) {
      firstLiveDate = item;
    }
  }

  return firstLiveDate;
}

export async function getUserFirstLiveDate(userEmail: string): Promise<string | undefined> {
  const apiGatewayClient = ApiGatewayClient.getInstance();

  const userId = await getUserIdByEmail(apiGatewayClient, userEmail);

  if (!userId) {
    logger.warn({ msg: 'User not found by email', userEmail });
    return undefined;
  }

  const propertySetIds = await getPropertySetIds(apiGatewayClient, userId);

  if (propertySetIds.length === 0) {
    logger.info({ msg: 'No property sets found for user', userEmail, userId });
    return undefined;
  }

  const firstLiveDate = await getFirstLiveDateByAccommodationIds(apiGatewayClient, propertySetIds);

  if (!firstLiveDate) {
    logger.info({ msg: 'No live date found for user', userEmail, userId });
    return undefined;
  }

  return firstLiveDate.toISOString().split('T')[0];
}
