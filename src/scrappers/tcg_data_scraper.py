#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import argparse
import time
from urllib.parse import urlencode
import os
import datetime
import re
import json
import csv
import math
import concurrent.futures
from tqdm import tqdm

# Start with --format json --workers 8
class TCGDataScraper:
    def __init__(self):
        self.base_url = "https://www.tcgcollector.com/cards/jp"
        self.card_base_url = "https://www.tcgcollector.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self.start_time = None
        self.pages_processed = 0
        
    def get_max_pages(self, params):
        """Get the maximum number of pages available for the search."""
        # Create a copy of params to avoid modifying the original
        page_params = params.copy()
        
        # Ensure we don't have a page parameter for the first request
        if 'page' in page_params:
            del page_params['page']
            
        query_string = urlencode(page_params)
        url = f"{self.base_url}?{query_string}"
        
        print(f"Checking max pages at: {url}")
        
        response = requests.get(url, headers=self.headers)
        
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return 1
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to find the pagination element by ID first
        pagination_container = soup.find("ul", id="card-search-result-pagination")
        
        if pagination_container:
            # Look for the last page indicator
            last_page_item = pagination_container.find("li", class_="pagination-item-last")
            if last_page_item:
                page_link = last_page_item.find("a")
                if page_link and page_link.text.strip().isdigit():
                    max_page = int(page_link.text.strip())
                    print(f"Detected {max_page} total pages from last page indicator")
                    return max_page
            
            # If no last page indicator, check all pagination items
            pagination_items = pagination_container.find_all("li", class_="pagination-item")
            max_page = 1
            
            for item in pagination_items:
                # Skip items with additional classes like 'pagination-item-gap'
                if 'pagination-item-gap' in item.get('class', []):
                    continue
                    
                page_link = item.find("a")
                if page_link and page_link.text.strip().isdigit():
                    page_num = int(page_link.text.strip())
                    max_page = max(max_page, page_num)
            
            if max_page > 1:
                print(f"Detected {max_page} total pages from pagination items")
                return max_page
        
        # Fallback method: Try to find standard pagination
        pagination = soup.find_all("li", class_="page-item")
        
        # If no pagination is found, try to estimate from total items
        if not pagination and not pagination_container:
            # Look for item count text
            item_count_div = soup.find("div", class_="results-count")
            if item_count_div and item_count_div.text:
                # Try to extract number like "Showing 1-60 of 157 items"
                count_text = item_count_div.text.strip()
                parts = count_text.split(" of ")
                if len(parts) > 1:
                    try:
                        total_items = int(parts[1].split(" ")[0])
                        cards_per_page = params.get('cardsPerPage', 60)
                        max_pages = (total_items + cards_per_page - 1) // cards_per_page
                        print(f"Estimated {max_pages} pages from {total_items} total items")
                        return max_pages
                    except (ValueError, IndexError):
                        pass
            
            print("No pagination found, assuming only one page is available")
            return 1
        
        # Process standard pagination if found
        max_page = 1
        for page_item in pagination:
            page_link = page_item.find("a", class_="page-link")
            if page_link and page_link.text.strip().isdigit():
                page_num = int(page_link.text.strip())
                max_page = max(max_page, page_num)
        
        print(f"Detected {max_page} total pages")
        return max_page
    
    def get_card_urls(self, params, page_num):
        """Get all card URLs from a page."""
        # Create a copy of params to avoid modifying the original
        page_params = params.copy()
        
        # Only add page parameter if it's not page 1
        if page_num > 1:
            page_params['page'] = page_num
        
        query_string = urlencode(page_params)
        url = f"{self.base_url}?{query_string}"
        
        print(f"Scraping page {page_num}: {url}")
        
        # Make the request
        response = requests.get(url, headers=self.headers)
        
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return []
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all card links
        card_links = soup.find_all("a", class_="card-image-grid-item-link")
        
        # Extract the URLs
        card_urls = [f"{self.card_base_url}{link.get('href')}" for link in card_links if link.get('href')]
        
        print(f"Found {len(card_urls)} card URLs on page {page_num}")
        
        return card_urls
    
    def scrape_card_data(self, url):
        """Scrape data for a single card."""
        try:
            # Make the request
            response = requests.get(url, headers=self.headers)
            
            if response.status_code != 200:
                print(f"Error: Received status code {response.status_code} for {url}")
                return None
            
            # Parse the HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract card data
            card_data = {}
            
            # URL
            card_data['url'] = url
            
            # Image URL
            image_container = soup.find(id="card-image-container")
            if image_container and image_container.find("img"):
                card_data['image_url'] = image_container.find("img").get('src', '')
            else:
                card_data['image_url'] = ''
            
            # Card name
            title_element = soup.find(id="card-info-title")
            if title_element and title_element.find("a"):
                card_data['name'] = title_element.find("a").text.strip()
            else:
                card_data['name'] = ''
            
            # Card type
            card_type_container = soup.find(class_="card-type-container")
            if card_type_container:
                card_data['card_type'] = card_type_container.text.strip()
            else:
                card_data['card_type'] = ''
            
            # Pokémon type
            energy_type_symbol = soup.find(class_="energy-type-symbol")
            if energy_type_symbol and energy_type_symbol.get('title'):
                card_data['pokemon_type'] = energy_type_symbol.get('title', '')
            else:
                card_data['pokemon_type'] = ''
            
            # Set information
            set_name_element = soup.find(id="card-info-footer-item-text-part-expansion-name")
            if set_name_element:
                card_data['set_name'] = set_name_element.text.strip()
            else:
                card_data['set_name'] = ''
            
            set_code_element = soup.find(id="card-info-footer-item-text-part-expansion-code")
            if set_code_element:
                card_data['set_code'] = set_code_element.text.strip()
            else:
                card_data['set_code'] = ''
            
            # Card number
            # Find all footer item text parts, one of them should be the card number
            footer_items = soup.find_all(class_="card-info-footer-item-text-part")
            for item in footer_items:
                # Check if this item contains the card number (usually has a pattern like XXX/XXX)
                text = item.text.strip()
                if re.search(r'\d+/\d+', text):
                    card_data['card_number'] = text
                    break
            else:
                card_data['card_number'] = ''
            
            # Rarity - New improved method
            rarity_link = soup.find("a", href=lambda href: href and "rarities=" in href, class_="card-info-footer-item-text-part")
            if rarity_link:
                card_data['rarity'] = rarity_link.text.strip()
            else:
                # Fallback to the old method
                for item in footer_items:
                    if 'Rarity' in item.text:
                        card_data['rarity'] = item.text.replace('Rarity:', '').strip()
                        break
                else:
                    card_data['rarity'] = ''
            
            # Illustrator - New improved method
            illustrator_container = soup.find("div", class_="card-info-footer-item", string=lambda s: s and "Illustrators" in s if s else False)
            if illustrator_container:
                illustrator_link = illustrator_container.find("a", href=lambda href: href and "illustrator=" in href)
                if illustrator_link:
                    card_data['illustrator'] = illustrator_link.text.strip()
                else:
                    card_data['illustrator'] = ''
            else:
                # Try a different approach - looking for the Illustrators title
                illustrator_title_div = soup.find("div", class_="card-info-footer-item-title", string="Illustrators")
                if illustrator_title_div and illustrator_title_div.parent:
                    illustrator_link = illustrator_title_div.parent.find("a", href=lambda href: href and "illustrator=" in href)
                    if illustrator_link:
                        card_data['illustrator'] = illustrator_link.text.strip()
                    else:
                        card_data['illustrator'] = ''
                else:
                    # Fallback to the old method
                    for item in footer_items:
                        if 'Illus' in item.text and item.find("a"):
                            card_data['illustrator'] = item.find("a").text.strip()
                            break
                    else:
                        card_data['illustrator'] = ''
            
            # Price
            price_button = soup.find("button", class_="card-price-details-modal-show-button")
            if price_button:
                price_text = price_button.text.strip()
                # Extract price value, often in format like "$0.53"
                price_match = re.search(r'(\$\d+\.\d+|\$\d+)', price_text)
                if price_match:
                    card_data['price'] = price_match.group(1)
                else:
                    card_data['price'] = price_text
            else:
                card_data['price'] = ''
            
            return card_data
        
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None
    
    def generate_output_filename(self):
        """Generate a filename based on current date/time."""
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        return f"jp_cards_data_{timestamp}"
    
    def print_progress_stats(self, page_num, total_pages, cards_processed, total_cards_processed, elapsed_time):
        """Print progress statistics."""
        # Calculate average time per page and card
        avg_time_per_page = elapsed_time / self.pages_processed if self.pages_processed > 0 else 0
        avg_time_per_card = elapsed_time / total_cards_processed if total_cards_processed > 0 else 0
        
        # Estimate remaining time
        remaining_pages = total_pages - page_num
        estimated_remaining_time = remaining_pages * avg_time_per_page
        
        # Format elapsed and estimated time
        elapsed_str = self.format_time(elapsed_time)
        remaining_str = self.format_time(estimated_remaining_time)
        
        print("\n" + "-"*50)
        print(f"PROGRESS: Page {page_num}/{total_pages} completed ({self.pages_processed} pages processed)")
        print(f"Cards processed on this page: {cards_processed}")
        print(f"Total cards processed so far: {total_cards_processed}")
        print(f"Elapsed time: {elapsed_str}")
        print(f"Estimated remaining time: {remaining_str}")
        print(f"Estimated completion time: {datetime.datetime.now() + datetime.timedelta(seconds=estimated_remaining_time)}")
        print("-"*50 + "\n")
    
    def format_time(self, seconds):
        """Format time in seconds to a human-readable string."""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f} minutes"
        else:
            hours = seconds / 3600
            return f"{hours:.1f} hours"
    
    def save_data(self, all_card_data, output_file, output_format):
        """Save the current data to the output file."""
        if output_format.lower() == 'json':
            # Save as JSON
            json_filename = f"{output_file}.json"
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(all_card_data, f, indent=2, ensure_ascii=False)
            print(f"Updated output file with {len(all_card_data)} card records")
        else:
            # Save as CSV
            csv_filename = f"{output_file}.csv"
            if all_card_data:
                # Get all unique field names from the data
                fieldnames = set()
                for card in all_card_data:
                    fieldnames.update(card.keys())
                
                with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=sorted(fieldnames))
                    writer.writeheader()
                    writer.writerows(all_card_data)
                print(f"Updated output file with {len(all_card_data)} card records")
    
    def process_cards_parallel(self, card_urls, workers):
        """Process multiple cards in parallel using ThreadPoolExecutor."""
        results = []
        success_count = 0
        fail_count = 0
        
        # Use ThreadPoolExecutor for parallel processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            # Create a progress bar
            with tqdm(total=len(card_urls), desc="Scraping cards", unit="card") as pbar:
                # Submit all card URLs to the executor
                future_to_url = {executor.submit(self.scrape_card_data, url): url for url in card_urls}
                
                # Process the results as they complete
                for future in concurrent.futures.as_completed(future_to_url):
                    url = future_to_url[future]
                    try:
                        card_data = future.result()
                        if card_data:
                            results.append(card_data)
                            success_count += 1
                        else:
                            print(f"Failed to scrape data for {url}")
                            fail_count += 1
                    except Exception as e:
                        print(f"Error processing {url}: {e}")
                        fail_count += 1
                    finally:
                        pbar.update(1)
        
        return results, success_count, fail_count
    
    def scrape(self, start_page=1, end_page=None, output_format="csv", output_file=None, workers=1):
        """
        Scrape card data from TCG Collector.
        
        Args:
            start_page: First page to scrape (default: 1)
            end_page: Last page to scrape (if None, will be determined automatically)
            output_format: 'csv' or 'json'
            output_file: Base filename to save the data (without extension)
            workers: Number of parallel workers for scraping cards (default: 1)
        """
        # Initialize timing stats
        self.start_time = time.time()
        self.pages_processed = 0
        
        # Generate output filename if not provided
        if output_file is None:
            output_file = self.generate_output_filename()
        
        # Set up the parameters
        params = {
            'releaseDateOrder': 'newToOld',
            'displayAs': 'images',
            'cardsPerPage': 120
        }
        
        # Determine the max available pages
        max_available_pages = self.get_max_pages(params)
        
        # If end_page is not specified, use the max available pages
        if end_page is None:
            end_page = max_available_pages
        else:
            end_page = min(end_page, max_available_pages)
        
        print(f"Scraping pages {start_page} to {end_page}")
        print(f"Output will be saved to '{output_file}.{output_format}'")
        print(f"Using {workers} parallel workers for card scraping")
        
        # Scrape each page
        all_card_data = []
        success_count = 0
        fail_count = 0
        
        for page_num in range(start_page, end_page + 1):
            page_start_time = time.time()
            card_urls = self.get_card_urls(params, page_num)
            
            # If we didn't find any URLs on this page, we're past the available content
            if not card_urls:
                print(f"No card URLs found on page {page_num}, stopping")
                break
            
            # Process cards in parallel or sequentially based on workers setting
            if workers > 1:
                print(f"Processing {len(card_urls)} cards with {workers} parallel workers...")
                page_results, page_success_count, page_fail_count = self.process_cards_parallel(card_urls, workers)
                all_card_data.extend(page_results)
                success_count += page_success_count
                fail_count += page_fail_count
            else:
                # Original sequential processing
                page_success_count = 0
                page_fail_count = 0
                
                for url in card_urls:
                    try:
                        card_data = self.scrape_card_data(url)
                        if card_data:
                            all_card_data.append(card_data)
                            success_count += 1
                            page_success_count += 1
                        else:
                            print(f"Failed to scrape data for {url}")
                            fail_count += 1
                            page_fail_count += 1
                    except Exception as e:
                        print(f"Error scraping {url}: {e}")
                        fail_count += 1
                        page_fail_count += 1
                    
                    # Be nice to the server
                    time.sleep(1)
            
            # Update pages processed count
            self.pages_processed += 1
            
            # Calculate elapsed time
            elapsed_time = time.time() - self.start_time
            page_elapsed_time = time.time() - page_start_time
            
            # Print progress
            print(f"Completed page {page_num}/{end_page} in {self.format_time(page_elapsed_time)}")
            print(f"Cards on this page: {page_success_count} successful, {page_fail_count} failed")
            
            # Print detailed stats
            self.print_progress_stats(
                page_num=page_num,
                total_pages=end_page,
                cards_processed=page_success_count + page_fail_count,
                total_cards_processed=success_count + fail_count,
                elapsed_time=elapsed_time
            )
            
            # Update the output file after each page is completed
            self.save_data(all_card_data, output_file, output_format)
            
            # Be nice to the server between pages
            if page_num < end_page:
                time.sleep(2)
        
        # Calculate final elapsed time
        total_elapsed_time = time.time() - self.start_time
        print(f"\nTotal scraping time: {self.format_time(total_elapsed_time)}")
        
        # Final data save (although this is redundant since we save after each page, keeping for clarity)
        self.save_data(all_card_data, output_file, output_format)
        
        # Print summary
        print("\n" + "="*50)
        print("SCRAPING SUMMARY")
        print("="*50)
        print(f"Total cards processed: {success_count + fail_count}")
        print(f"Successfully scraped: {success_count}")
        print(f"Failed to scrape: {fail_count}")
        print(f"Total time: {self.format_time(total_elapsed_time)}")
        print(f"Average time per card: {self.format_time(total_elapsed_time / (success_count + fail_count) if (success_count + fail_count) > 0 else 0)}")
        print(f"Average time per page: {self.format_time(total_elapsed_time / self.pages_processed if self.pages_processed > 0 else 0)}")
        print("="*50)
        
        return all_card_data


def parse_args():
    parser = argparse.ArgumentParser(description='Scrape Japanese card data from TCG Collector')
    
    parser.add_argument('--start-page', type=int, default=1,
                        help='First page to scrape (default: 1)')
    
    parser.add_argument('--end-page', type=int,
                        help='Last page to scrape (if not specified, will scrape all available pages)')
    
    parser.add_argument('--output', type=str,
                        help='Output file base name (without extension)')
    
    parser.add_argument('--format', choices=['csv', 'json'], default='csv',
                        help='Output format (csv or json)')
    
    parser.add_argument('--workers', type=int, default=1,
                        help='Number of parallel workers for scraping cards (default: 1)')
    
    return parser.parse_args()


def main():
    args = parse_args()
    
    scraper = TCGDataScraper()
    scraper.scrape(
        start_page=args.start_page,
        end_page=args.end_page,
        output_format=args.format,
        output_file=args.output,
        workers=args.workers
    )


if __name__ == "__main__":
    main() 