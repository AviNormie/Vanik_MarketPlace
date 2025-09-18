import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SearchLocationDto, NearbyLocationDto } from './dto/search-location.dto';

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}

@Injectable()
export class LocationService {
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

  constructor(private readonly httpService: HttpService) {}

  async searchLocation(searchLocationDto: SearchLocationDto) {
    try {
      const { query, limit } = searchLocationDto;
      
      const response = await firstValueFrom(
        this.httpService.get<{ data: NominatimResult[] }>(
          `${this.nominatimBaseUrl}/search`,
          {
            params: {
              q: query,
              format: 'json',
              limit: limit || 5,
              countrycodes: 'in', // Restrict to India
              addressdetails: 1,
            },
            headers: {
              'User-Agent': 'MarketPlace-SIH/1.0',
            },
          },
        ),
      );

      return response.data.data.map((result) => ({
        id: result.place_id,
        name: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        type: result.type,
        class: result.class,
        importance: result.importance,
        boundingBox: {
          south: parseFloat(result.boundingbox[0]),
          north: parseFloat(result.boundingbox[1]),
          west: parseFloat(result.boundingbox[2]),
          east: parseFloat(result.boundingbox[3]),
        },
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to search location',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async reverseGeocode(latitude: number, longitude: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: NominatimResult }>(
          `${this.nominatimBaseUrl}/reverse`,
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'json',
              addressdetails: 1,
            },
            headers: {
              'User-Agent': 'MarketPlace-SIH/1.0',
            },
          },
        ),
      );

      const result = response.data.data;
      return {
        id: result.place_id,
        name: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        type: result.type,
        class: result.class,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to reverse geocode location',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findNearbyListings(nearbyLocationDto: NearbyLocationDto) {
    // This is a mock implementation since we don't have geospatial queries in our simple setup
    // In a real implementation, you would use PostGIS or similar for efficient geospatial queries
    const { latitude, longitude, radiusKm } = nearbyLocationDto;
    
    // Mock nearby listings data
    return {
      center: {
        latitude,
        longitude,
      },
      radiusKm: radiusKm || 50,
      listings: [
        {
          id: 'mock-listing-1',
          cropType: 'Wheat',
          quantityKg: 1000,
          expectedPrice: 25000,
          location: 'Near Delhi, India',
          distance: 15.5,
          farmerId: 'mock-farmer-1',
        },
        {
          id: 'mock-listing-2',
          cropType: 'Rice',
          quantityKg: 2000,
          expectedPrice: 45000,
          location: 'Near Gurgaon, India',
          distance: 25.3,
          farmerId: 'mock-farmer-2',
        },
      ],
    };
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getLocationSuggestions(query: string) {
    // Quick location suggestions for autocomplete
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: NominatimResult[] }>(
          `${this.nominatimBaseUrl}/search`,
          {
            params: {
              q: query,
              format: 'json',
              limit: 5,
              countrycodes: 'in',
              addressdetails: 0,
            },
            headers: {
              'User-Agent': 'MarketPlace-SIH/1.0',
            },
          },
        ),
      );

      return response.data.data.map((result) => ({
        id: result.place_id,
        name: result.display_name,
        type: result.type,
      }));
    } catch (error) {
      return [];
    }
  }
}