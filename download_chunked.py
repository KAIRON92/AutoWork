import sys
import time
import urllib.request

def download_file_ranged(url, output_path, chunk_size=256*1024):
    # First get total size using range 0-0
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        content_range = resp.headers.get('Content-Range', '')
        total_size = int(content_range.split('/')[-1])
    
    print(f"Downloading {url} ({total_size} bytes) using {chunk_size//1024}KB HTTP Range chunks...")
    
    with open(output_path, 'wb') as f:
        start = 0
        while start < total_size:
            end = min(start + chunk_size - 1, total_size - 1)
            chunk_req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Range': f'bytes={start}-{end}'
            })
            success = False
            for attempt in range(10):
                try:
                    with urllib.request.urlopen(chunk_req, timeout=15) as chunk_resp:
                        data = chunk_resp.read()
                        if len(data) > 0:
                            f.write(data)
                            start += len(data)
                            success = True
                            pct = int(start / total_size * 100)
                            print(f"Downloaded {start}/{total_size} bytes ({pct}%)", end='\r')
                            break
                except Exception as e:
                    print(f"\nRetry {start}-{end} (attempt {attempt+1}): {e}")
                    time.sleep(0.5)
            if not success:
                raise RuntimeError(f"Failed at byte {start}")
    print(f"\nSuccessfully downloaded {output_path} ({total_size} bytes)")

if __name__ == '__main__':
    download_file_ranged(sys.argv[1], sys.argv[2])
