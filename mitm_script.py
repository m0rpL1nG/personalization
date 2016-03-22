'''
Created on Jan 9, 2016
@author: jeffh

usage:
  online:
    sudo mitmproxy -s mitm_script.py 
  nohup:
    sudo mitmdump -s mitm_script.py -w mitm_out.txt > mitm_out2.txt 2>&1 &
    
    kill:
       ps -ea | egrep mitmdump
       kill xxxxx # process id

script to give to mitmproxy
'''
import time
import json
import traceback
import codecs
import httplib
import urllib
import re
import zlib
import gzip
from StringIO import StringIO
from libmproxy.script import concurrent
from libmproxy.models import decoded
from libmproxy.models import HTTPResponse
from netlib.http import Headers

allowed_hosts = ["www.expedia.com",]

# logging (call flush after, to see it right away)
lg = codecs.open('personalization_%s.log' % time.strftime("%Y-%m-%d_%H-%M-%S", time.gmtime()), 'w', 'utf-8', errors='ignore') # handle unicode

RE_EXPEDIA_HASHPARAM = re.compile("hashParam: \'(\S+)\'")
filterHeaders = ['Referer','Origin']

@concurrent  # Removing this may cause slowdown
def request(context, flow):
  # reject almost every url
  if flow.request.host not in allowed_hosts:
    context.kill_flow(flow)
    lg.write("Killed flow to %s\n" % flow.request.host)
    lg.flush()
    return
#  else:
#    lg.write("Allowed flow to %s\n" % flow.request.host)
#    lg.flush()

  # reject if it doesn't say /vspersonal/xxx
  if '/vspersonal' not in flow.request.path:
    context.kill_flow(flow)
    lg.write("Killed flow with path %s\n" % flow.request.path)
    lg.flush()
    return

  # fix for FF OPTIONS: http://stackoverflow.com/questions/1099787/jquery-ajax-post-sending-options-as-request-method-in-firefox
  if flow.request.method == "OPTIONS":
    lg.write("Options Req to %s\n" % flow.request.host)
    lg.flush()

    try:
      h = Headers(Content_Type="text/plain")
#      h['Access-Control-Allow-Origin'] = '*' # didn't work for some reason
      h['Access-Control-Allow-Origin'] = flow.request.headers['Origin'] # allow where they're coming from, consider only allowing *.volunteerscience.com
      h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
      h['Access-Control-Max-Age'] = '60000' # one min
      h['Access-Control-Allow-Headers'] = 'origin, x-csrftoken, content-type, accept'
      h['Access-Control-Allow-Credentials'] = 'true' # required for xhrFields: { withCredentials: true }
      resp = HTTPResponse("HTTP/1.1", 200, "OK", h, "")
      flow.reply(resp)
    except:
      traceback.print_exc(file=lg)

    lg.write("Options Req Complete to %s\n" % flow.request.host)
    lg.flush()
    return

  if flow.request.host == "www.expedia.com":
    return expediaRequest(context, flow)


def response(context, flow):
  if flow.request.host == "www.expedia.com":
    return expediaResponse(context, flow)


def expediaRequest(context, flow):
  if flow.request.method == "GET": # handle the https redirect
    # 1) Find the hashParam by doing an https request with the user's headers
    hdrs = {}
    for h in flow.request.headers:
      if h not in filterHeaders:
        hdrs[h] = flow.request.headers[h]
#      else:
#        lg.write("  -- not using\n")

    c = httplib.HTTPSConnection("www.expedia.com")
    params = urllib.urlencode({'destination': flow.request.query["destination"], 'startDate': flow.request.query["startDate"], 'endDate': flow.request.query["endDate"], 'adults': flow.request.query["adults"]})
    c.request("GET", "/Hotel-Search?#%s" % params, "", hdrs)
    response = c.getresponse()

    data = None
    if "gzip" == response.getheader('content-encoding'):
        #response.info().get("Content-encoding"):
        buf = StringIO(response.read())
        f = gzip.GzipFile(fileobj=buf)
        data = f.read()
    else:
        data = response.read()

    m = RE_EXPEDIA_HASHPARAM.search(data)
    hashParam = m.group(1)

    #lg.write("hashParam:%s\n" % hashParam)
    lg.flush()
    h = Headers(Content_Type="text/plain")
    resp = HTTPResponse("HTTP/1.1", 200, "OK", h, hashParam)
    flow.reply(resp)

#    flow.request.path = 'http://www.expedia.com/vspersonal/Hotel-Search?inpAjax=true&responsive=true'

  if flow.request.method == "POST":
    if flow.request.urlencoded_form['hashParam'][0] == "f47b011acfc5249e9966c1acd0c52c9d163daae5":
      flow.request.headers['Cookie'] = 'SSID1=CACvtx1wAAAAAABYJY9W-d5FBFglj1YBAAAAAAAAAAAAWCWPVgAKircEAAEXdwAAWCWPVgEAsAQAAa92AABYJY9WAQC5BAABJXcAAFglj1YBAK8EAAGsdgAAWCWPVgEAtQQAAQZ3AABYJY9WAQC0BAABA3cAAFglj1YBALgEAAEadwAAWCWPVgEAvgQAAcJ3AABYJY9WAQA; SSSC1=1.G6237245068890463993.1|1199.30380:1200.30383:1204.30467:1205.30470:1207.30487:1208.30490:1209.30501:1214.30658; MC1=GUID=803cd47a399c45cb957978f8b8aab687; JSESSION=3440b793-4d5f-4e0e-b691-0ae1fdad4691; tpid=v.1,1; iEAPID=0,; abucket=CgAUc1aPJVeT6BB7pl0ZAg==; SSRT1=WCWPVgIDAQ; __utmt=1; __utma=16308457.2088891848.1452221786.1452221786.1452221786.1; __utmb=16308457.1.10.1452221786; __utmc=16308457; __utmz=16308457.1452221786.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); aspp=v.1,0|||||||||||||; eid=-1; s_cc=true; ipsnf3=v.3|us|1|744|honolulu; _cc=ZDA1Y2JhMzgtNjU2Ni00Mjc5LWE0YmUtOTkzZWJjZGM5Y2MzOjE0NTIyMjE3ODgwNjg; MediaCookie=0%7C2593%2C2563%2CBKC%2C31127; utag_main=v_id:01521f29ee8a0074022bed0e89f00b07900180710093c$_sn:1$_ss:1$_pn:1%3Bexp-session$_st:1452223587786$ses_id:1452221787786%3Bexp-session$dc_visit:1$dc_event:1%3Bexp-session; _ga=GA1.2.2088891848.1452221786; _gat_ua=1; __qca=P0-1655839093-1452221791945; _tq_id.TV-721872-1.7ec4=f13e60f0bf8f7421.1452221792.0.1452221792..; __gads=ID=e467f079dd328a46:T=1452221792:S=ALNI_MbWgX3mjx_B4xkNLTpIppiKCSyQYg; IAID=418047a9-b7c1-4472-95cd-0a75bfca38aa; s_fid=26BBFDB29B009DC3-29429116A147DDF7; cesc=%7B%7D; s_vi=[CS]v1|2B4792AE05013A9E-60001607E0009084[CE]; SSLB=1; linfo=v.4,|0|0|255|1|0||||||||1033|0|0||0|0|0|-1|-1'

  flow.request.path = flow.request.path.replace('/vspersonal','')

def expediaResponse(context, flow):
  if flow.request.path.startswith("/Hotel-Search"):
    expediaHotelResponse(context, flow)

  if flow.request.method in ["GET","POST"]:
    lg.write("Rewriting GET headers")
    h = flow.response.headers
    h['Access-Control-Allow-Origin'] = flow.request.headers['Origin'] # allow where they're coming from, consider only allowing *.volunteerscience.com
    h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    h['Access-Control-Max-Age'] = '60000' # one min
    h['Access-Control-Allow-Headers'] = 'origin, x-csrftoken, content-type, accept'
    h['Access-Control-Allow-Credentials'] = 'true' # required for xhrFields: { withCredentials: true }

def expediaHotelResponse(context, flow):
  f = flow.request.urlencoded_form
  if f:
    lg.write("dest: %s\n" % (f['destination'][0],))
    with decoded(flow.response):
      dj = None
      try:
        dj=json.loads(flow.response.content)
      except:
        lg.write("cant decode json")
        lg.write(flow.response.content)
      try:
        if dj:
          lg.write("Got %s results\n" % len(dj['results']))
          ret = []
          for idx, v in enumerate(dj['results']):
            lg.write("  %s : %s : %s\n" % (idx,v['retailHotelPricingModel']['price'],v['retailHotelInfoModel']['hotelName']))
            ret.append([v['retailHotelPricingModel']['price'],v['retailHotelInfoModel']['hotelName']])
          flow.response.content = json.dumps(ret)
      except:
        traceback.print_exc(file=lg)

    lg.flush()


def done(context):
  lg.close()

