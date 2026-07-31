// Exclude from coverage
import type { IPowershellService } from 'infrastructure/powershell';

export interface IPowershellModifierService {
	modify(
		filePath: string,
		searchWord: string,
		replaceWord: string,
	): Promise<boolean>;
	appendToEnd(filePath: string, codeToAppend: string): Promise<boolean>;
	read(filePath: string): Promise<string | null>;
}

export class PowershellModifierService implements IPowershellModifierService {
	private executor: IPowershellService;

	public constructor(executor: IPowershellService) {
		this.executor = executor;
	}

	public async modify(
		filePath: string,
		searchWord: string,
		replaceWord: string,
	): Promise<boolean> {
		const psScript = `
	  $ErrorActionPreference = 'Stop';
	  $path = '${filePath}';
	  $search = '${searchWord}';
	  $target = '${replaceWord}';
	  $content = [System.IO.File]::ReadAllText($path);
	  $evaluator = [System.Text.RegularExpressions.MatchEvaluator] {
		  param($m)
		  $val = $m.Value	  
		  if ($val -ceq $val.ToUpper()) { return $target.ToUpper() }	  
		  if ($val -ceq $val.ToLower()) { return $target.ToLower() }	  
		  if ($val.Substring(0,1) -ceq $val.Substring(0,1).ToUpper()) {
			  return $target.Substring(0,1).ToUpper() + $target.Substring(1).ToLower()
		  }
		  return $target
	  };
	  $regex = [System.Text.RegularExpressions.Regex]::new($search, 'IgnoreCase');
	  $newContent = $regex.Replace($content, $evaluator);
	  [System.IO.File]::WriteAllText($path, $newContent);
	`;

		const result = await this.executor.execute(`& { ${psScript} }`);

		if (!result.success) {
			return false;
		}

		return true;
	}

	public async appendToEnd(
		filePath: string,
		codeToAppend: string,
	): Promise<boolean> {
		const safePath = filePath.replace(/'/g, "''");
		const safeCode = codeToAppend.replace(/'/g, "''");

		const psScript = `
      $ErrorActionPreference = 'Stop';
      $path = '${safePath}';
      $textToAppend = '${safeCode}';
      [System.IO.File]::AppendAllText($path, $textToAppend);
    `;

		const result = await this.executor.execute(`& { ${psScript} }`);

		if (!result.success) {
			return false;
		}

		return true;
	}

	public async read(filePath: string): Promise<string | null> {
		const safePath = filePath.replace(/'/g, "''");

		const psScript = `
      $ErrorActionPreference = 'Stop';
      $path = '${safePath}';
      [System.IO.File]::ReadAllText($path);
    `;

		const result = await this.executor.execute(`& { ${psScript} }`);

		if (!result.success) {
			return null;
		}

		return result.output || '';
	}
}
