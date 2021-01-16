# Ethereum Contract Bot

### Instalacija
Kada se skine projekat, potrebno je da se uradi: 'npm i' kako bi se skinule potrebne biblioteke ( express i web3 ) jer nije okacen node_modules/. 
Nakon toga se pokrece sa komandom node app.js. Nije potrebna nikakva interakcija sa user-om, server vrsi provere i upisivanje automatski.

### Ideja
Ideja je bila da kada se server pokrene, automatski se pokrece i metoda checkForCurrentPrice() da na svakih minut uzima cenu sa API-a i proverava dal je potrebno da se upise na contract. 
 Metoda timeoutForContractCheck(minutes) sluzi da server ne poziva prvih 15 minuta read contract jer nije jos uvek sakupio dovoljno podataka za srednju vrednost cene, 
 poziva se kada se upise vrednost na contract jer nema potrebe da proverava naredni period i takodje se poziva ukoliko se vidi da je vreme na cotractu krace od 15 minuta da saceka 
 tih n minuta da ne poziva contract. Ukoliko su oba uslova ispunjena ( 15 min i 2% promene cene ), poziva se metoda writeContract koja pravi objekat i potpisuje ga
 ( u konstanti se nalaze accountAddress i privateKey ) i salje transakciju ( taj account placa gas ). 
 Komunikacija preko web3 se obavlja u posebnom modulu radi preglednosti.
 
 Sam api '/get-price' poziva metode za cenu conttracta i trenutnu cenu i ceka promise da se zavrse i salje user-u podatke u json formatu. 
 
 Provere oko proteklog vremena i promene cene se odvija preko poziva contract.methods.imeMetode
