from lunar_python import Solar

solar = Solar.fromYmdHms(2023, 1, 1, 12, 0, 0)
lunar = solar.getLunar()
bazi = lunar.getEightChar()

pillar_types = ['Year', 'Month', 'Day', 'Time']
for p in pillar_types:
    method_name = f'get{p}ShiShenGan'
    params_method = f'get{p}ShiShenZhi'
    print(f"Checking {method_name}: ", end="")
    try:
        getattr(bazi, method_name)
        print("EXISTS")
    except AttributeError:
        print("MISSING")
        

    extra_methods = ['DiShi', 'NaYin', 'XunKong']
    for suffix in extra_methods:
        idx_method = f'get{p}{suffix}'
        print(f"Checking {idx_method}: ", end="")
        try:
            getattr(bazi, idx_method)
            print("EXISTS")
        except AttributeError:
            print("MISSING")

