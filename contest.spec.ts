import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface Submission {
  problemnumber: string;
  problemname: string;
  zipfile: string;
  language: string;
}
test('Submeter vários problemas com base no JSON', async ({ page }) => {
  const now = new Date();
  const brasilData = new Date(now.getTime() - 3.5 * 60 * 60 * 1000);
  const hours = brasilData.getUTCHours();
  const minutes = brasilData.getUTCMinutes();

  // Lê o JSON contendo as submissões
  const submissions = JSON.parse(fs.readFileSync('submissoes.json', 'utf8'));

  // Login como system para ativar o contest
  await page.goto('http://localhost:8000/boca/');
  await page.locator('input[name="name"]').fill('system');
  await page.locator('input[name="password"]').fill('boca');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Contest' }).click();
  await page.getByRole('combobox').selectOption('new');
  await page.locator('input[name="startdateh"]').fill(String(hours));
  await page.locator('input[name="startdatemin"]').fill(String(minutes));
  page.once('dialog', async dialog => await dialog.accept());
  await page.getByRole('button', { name: 'Activate' }).click();

  // Login como admin para inserir os problemas
  await page.goto('http://localhost:8000/boca/index.php');
  await page.locator('input[name="name"]').fill('admin');
  await page.locator('input[name="password"]').fill('boca');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Problems' }).click();

  // Envia os problemas conforme o JSON
  for (const sub of submissions) {
    await page.locator('input[name="problemnumber"]').fill(sub.problemnumber);
    await page.locator('input[name="problemname"]').fill(sub.problemname);
    await page.locator('input[name="probleminput"]').setInputFiles(sub.zipfile);
    page.once('dialog', async dialog => await dialog.accept());
    await page.getByRole('button', { name: 'Send' }).click();
  }

  // Importa os usuários
  await page.getByRole('link', { name: 'Users' }).click();
  await page.locator('input[name="importfile"]').setInputFiles('user.txt');
  page.once('dialog', async dialog => await dialog.accept());
  await page.getByRole('button', { name: 'Import' }).click();

  // Ativa o site
  await page.getByRole('link', { name: 'Site' }).click();
  await page.locator('input[name="startdateh"]').fill(String(hours));
  await page.locator('input[name="startdatemin"]').fill(String(minutes));
  await page.getByRole('cell', { name: '<- experimental' }).click();
  await page.locator('input[name="autojudge"]').check();
  page.once('dialog', async dialog => await dialog.accept());
  await page.getByRole('button', { name: 'Send' }).click();
});




interface Language {
  name: string;
  extension: string;
  id: string;
}

test('Submit solutions and get results', async ({ page }) => {
  test.setTimeout(180_000);

  const configPath = path.join('config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { languages: Language[] };

  // Lê json de submissões
  const submissaoData = JSON.parse(await fs.promises.readFile('submissoes.json', 'utf-8')) as Submission[];

  // Lê arquivos modificados (com caminho completo)
  const changedFiles = (await fs.promises.readFile('changed_files.txt', 'utf-8'))
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Login no BOCA
  await page.goto('http://localhost:8000/boca/');
  await page.locator('input[name="name"]').fill('bot');
  await page.locator('input[name="password"]').fill('boca');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Problems' }).click();
  await page.getByRole('link', { name: 'Runs' }).click();
  await page.waitForSelector('form[action="run.php"]', { timeout: 5000 });
  await page.waitForSelector('select[name="problem"]', { timeout: 5000 });

  let problemOptionVisible = false;
  const maxRetries = 2;
  let retries = 0;

  while (!problemOptionVisible && retries < maxRetries) {
    console.log(`🔁 Tentativa ${retries + 1}`);
    try {
      await page.goto('http://localhost:8000/boca/index.php');
      await page.locator('input[name="name"]').fill('bot');
      await page.locator('input[name="password"]').fill('boca');
      await page.getByRole('button', { name: 'Login' }).click();

      await page.getByRole('link', { name: 'Problems' }).click();
      await page.getByRole('cell', { name: 'Runs' }).click();

      const select = page.locator('select[name="problem"]');
      await select.waitFor({ timeout: 5000 });

      const optionCount = await select.locator('option:not([value="-1"])').count();
      if (optionCount > 0) {
        problemOptionVisible = true;
        console.log(`✅ ${optionCount} opção(ões) encontrada(s). Prosseguindo...`);
      } else {
        throw new Error('⚠️ Nenhuma opção encontrada no <select>.');
      }
    } catch (err) {
      console.log(`⚠️ ${err.message}`);
      try {
        await page.getByRole('link', { name: 'Logout' }).click();
      } catch {
        console.log('⚠️ Logout falhou ou não era necessário.');
      }
      await page.waitForTimeout(3000);
      retries++;
    }
  }

  if (!problemOptionVisible) {
    throw new Error('❌ Não foi possível encontrar nenhuma opção de problema após várias tentativas.');
  }

  const exercises: string[] = [];

  for (const filepath of changedFiles) {
    const filename = path.basename(filepath); // ans.py
    const extension = path.extname(filename).slice(1); // py
    const dirName = path.basename(path.dirname(filepath)); // L1_3
    const submissao = submissaoData.find(s => s.problemname === dirName);
    const linguagem = config.languages.find(l => l.extension === extension);

    if (!submissao || !linguagem) {
      console.log(`⚠️ Dados insuficientes para submeter ${filename}`);
      continue;
    }

    console.log(`🚀 Submetendo ${filename} com linguagem ID ${linguagem.id}`);
    await page.locator('select[name="problem"]').selectOption(submissao.problemnumber);
    await page.locator('select[name="language"]').selectOption(linguagem.id);
    await page.locator('input[name="sourcefile"]').setInputFiles(filepath);

    page.once('dialog', async dialog => await dialog.accept());
    await page.getByRole('button', { name: 'Send' }).click();
    await page.waitForTimeout(1000);

    exercises.push(dirName);
  }

  // Esperar BOCA julgar
  await page.goto('http://localhost:8000/boca/team/run.php');
  await page.waitForTimeout(10_000);
  await page.goto('http://localhost:8000/boca/team/run.php');

  let stillWaiting = true;
  while (stillWaiting) {
    try {
      await page.waitForSelector('text="Not answered yet"', { timeout: 2000 });
      console.log('⌛ Ainda aguardando autojudge...');
    } catch {
      stillWaiting = false;
      console.log('✅ Todas as submissões foram julgadas.');
    }
    if (stillWaiting) {
      await page.waitForTimeout(3000);
      await page.goto('http://localhost:8000/boca/team/run.php');
    }
  }

  // Acessar interface de admin e login
  await page.goto('http://localhost:8000/boca/');
  await page.locator('input[name="name"]').fill('admin');
  await page.locator('input[name="password"]').fill('boca');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Runs' }).click();

  // Espera a tabela de submissões carregar
  await page.waitForSelector('form[action="run.php"] table');

  // Seleciona os links da primeira coluna da tabela de submissões
  const runLinks = await page.locator('form[action="run.php"] table tr td:first-child a').all();

  const results: string[] = [];
  const stdouts: string[] = [];
  const stderrs: string[] = [];

  // Pega as últimas N submissões (exercises.length), em ordem inversa (mais antigas por último)
  const selectedRuns = runLinks.slice(-exercises.length);

  // Iterar sobre os links das submissões na ordem correta
for (let i = 0; i < selectedRuns.length; i++) {
  const link = selectedRuns[i];
  const href = await link.getAttribute('href');
  if (!href) {
    results.push('Run link não encontrado');
    stdouts.push('');
    stderrs.push('');
    continue;
  }

  const runPage = await page.context().newPage();
  await runPage.goto(`http://localhost:8000/boca/admin/${href}`);

  // Pegando o resultado textual (ex: NO - Compilation error)
  const answerText = await runPage.locator('select[name="answer"] option[selected]').textContent();
  results.push(answerText?.trim() || 'Resultado não encontrado');

  try {
    // Tentando obter os links com timeout de 5 segundos
    const stdoutLink = await runPage.getByRole('link', { name: 'stdout' }).getAttribute('href', { timeout: 5000 });
    const stderrLink = await runPage.getByRole('link', { name: 'stderr' }).getAttribute('href', { timeout: 5000 });

    const [stdoutResp, stderrResp] = await Promise.all([
      stdoutLink ? runPage.request.get(`http://localhost:8000/boca/admin/${stdoutLink}`) : Promise.resolve(null),
      stderrLink ? runPage.request.get(`http://localhost:8000/boca/admin/${stderrLink}`) : Promise.resolve(null),
    ]);

    const stdout = stdoutResp ? await stdoutResp.text() : '';
    const stderr = stderrResp ? await stderrResp.text() : '';
    stdouts.push(stdout);
    stderrs.push(stderr);
  } catch (e) {
    console.warn(`⚠️ Falha ao buscar stdout/stderr da run ${href}: ${e.message}`);
    stdouts.push('');
    stderrs.push('');
  }
}

  results.reverse();
  stdouts.reverse();
  stderrs.reverse();

  // Salvar resultado em problemas/<dir>/resposta.txt, stdout.txt, stderr.txt
  for (let i = 0; i < exercises.length; i++) {
    const basePath = path.join('problemas', exercises[i]);
    await fs.promises.writeFile(path.join(basePath, 'resposta.txt'), results[i]);
    await fs.promises.writeFile(path.join(basePath, 'stdout.txt'), stdouts[i]);
    await fs.promises.writeFile(path.join(basePath, 'stderr.txt'), stderrs[i]);
    console.log(`📄 Resultado salvo em ${basePath}/resposta.txt`);
  }
});
